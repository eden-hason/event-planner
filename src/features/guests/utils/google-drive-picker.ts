/**
 * Google Drive import for the mobile guest-import wizard: browser-only, no
 * server round trip and nothing persisted. Google Identity Services requests
 * a `drive.file` access token on demand, the Picker restricts selection to
 * spreadsheet-shaped files, and the chosen file's bytes are downloaded
 * client-side and handed back as a plain `File` - from there it flows into
 * the same `parseCSVFile` pipeline as a device upload, unchanged.
 *
 * Deliberately minimal: no token table, no refresh handling, no Supabase
 * coupling. The trade-off is that "connected" only lasts the page session -
 * there is nothing to persist, so a reload asks again.
 */

import { MAX_IMPORT_FILE_BYTES } from './import-guests';

interface GoogleDocsView {
  setMimeTypes: (mimeTypes: string) => GoogleDocsView;
  setIncludeFolders: (include: boolean) => GoogleDocsView;
}

interface GooglePickerInstance {
  setVisible: (visible: boolean) => void;
}

interface GooglePickerBuilder {
  addView: (view: GoogleDocsView) => GooglePickerBuilder;
  setOAuthToken: (token: string) => GooglePickerBuilder;
  setDeveloperKey: (key: string) => GooglePickerBuilder;
  setAppId: (appId: string) => GooglePickerBuilder;
  setCallback: (cb: (data: PickerResponse) => void) => GooglePickerBuilder;
  setSize: (width: number, height: number) => GooglePickerBuilder;
  build: () => GooglePickerInstance;
}

declare global {
  interface Window {
    google: {
      accounts: {
        oauth2: {
          initTokenClient(config: {
            client_id: string;
            scope: string;
            callback: (response: { access_token?: string; error?: string }) => void;
          }): { requestAccessToken: () => void };
        };
      };
      picker: {
        DocsView: new (viewId?: unknown) => GoogleDocsView;
        ViewId: { DOCS: unknown };
        Action: { PICKED: string; CANCEL: string };
        PickerBuilder: new () => GooglePickerBuilder;
      };
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    gapi: any;
  }
}

interface PickerResponse {
  action: string;
  docs?: Array<{ id: string; name: string; mimeType: string }>;
}

const SCOPE = 'https://www.googleapis.com/auth/drive.file';
const GOOGLE_SHEET_MIME_TYPE = 'application/vnd.google-apps.spreadsheet';
const DRIVE_MIME_TYPES = [
  'text/csv',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  GOOGLE_SHEET_MIME_TYPE,
].join(',');

let gisScriptPromise: Promise<void> | null = null;
let pickerReadyPromise: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

function ensureGis(): Promise<void> {
  if (!gisScriptPromise) {
    gisScriptPromise = loadScript('https://accounts.google.com/gsi/client');
  }
  return gisScriptPromise;
}

function ensurePicker(): Promise<void> {
  if (!pickerReadyPromise) {
    pickerReadyPromise = loadScript('https://apis.google.com/js/api.js').then(
      () =>
        new Promise<void>((resolve, reject) => {
          window.gapi.load('picker', {
            callback: () => resolve(),
            onerror: () => reject(new Error('Failed to load Google Picker')),
          });
        }),
    );
  }
  return pickerReadyPromise;
}

/**
 * Fire-and-forget: call this as soon as a screen that offers Drive import
 * mounts, so the two Google scripts are already loaded by the time the user
 * taps the button. `requestAccessToken()` opens Google's consent popup, and
 * popup blockers are strict about that happening within the same tick as the
 * click - without this, the awaited script loads on a cold cache can push
 * the token request past that window on some browsers (Safari especially).
 */
export function preloadGoogleDrivePicker(): void {
  ensureGis().catch(() => {});
  ensurePicker().catch(() => {});
}

function requestAccessToken(): Promise<string> {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  if (!clientId) {
    return Promise.reject(new Error('Google Drive import is not configured.'));
  }
  return new Promise((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope: SCOPE,
      callback: (response) => {
        if (response.error || !response.access_token) {
          reject(new Error('Google sign-in was cancelled or denied.'));
          return;
        }
        resolve(response.access_token);
      },
    });
    tokenClient.requestAccessToken();
  });
}

interface PickedDoc {
  id: string;
  name: string;
  mimeType: string;
}

function showPicker(accessToken: string): Promise<PickedDoc | null> {
  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PICKER_API_KEY;
  const appId = process.env.NEXT_PUBLIC_GOOGLE_PROJECT_NUMBER;
  if (!apiKey || !appId) {
    return Promise.reject(new Error('Google Drive import is not configured.'));
  }

  return new Promise((resolve) => {
    const view = new window.google.picker.DocsView(window.google.picker.ViewId.DOCS)
      .setMimeTypes(DRIVE_MIME_TYPES)
      .setIncludeFolders(false);

    // Google's default picker size is a small fixed box that wastes most of
    // the viewport, especially on mobile where this is the only thing on
    // screen. Fill almost all of it instead, capped so it doesn't balloon on
    // a wide desktop window.
    const width = Math.min(1200, window.innerWidth - 24);
    const height = Math.min(900, window.innerHeight - 24);

    const picker = new window.google.picker.PickerBuilder()
      .addView(view)
      .setOAuthToken(accessToken)
      .setDeveloperKey(apiKey)
      .setAppId(appId)
      .setSize(width, height)
      .setCallback((data: PickerResponse) => {
        if (data.action === window.google.picker.Action.PICKED) {
          const doc = data.docs?.[0];
          resolve(doc ? { id: doc.id, name: doc.name, mimeType: doc.mimeType } : null);
        } else if (data.action === window.google.picker.Action.CANCEL) {
          resolve(null);
        }
      })
      .build();

    picker.setVisible(true);
  });
}

async function downloadDoc(doc: PickedDoc, accessToken: string): Promise<File> {
  // A native Google Sheet has no file bytes of its own - it only comes out
  // through an explicit export, and only the first tab, the same limit
  // `parseCSVFile` already applies to a multi-sheet Excel workbook.
  const isNativeSheet = doc.mimeType === GOOGLE_SHEET_MIME_TYPE;
  const url = isNativeSheet
    ? `https://www.googleapis.com/drive/v3/files/${doc.id}/export?mimeType=text/csv`
    : `https://www.googleapis.com/drive/v3/files/${doc.id}?alt=media`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new Error('Could not download the file from Google Drive.');
  }

  const blob = await response.blob();
  if (blob.size > MAX_IMPORT_FILE_BYTES) {
    throw new Error('That file is larger than 5MB.');
  }

  const fileName = isNativeSheet ? `${doc.name}.csv` : doc.name;
  const fileType = isNativeSheet ? 'text/csv' : doc.mimeType;
  return new File([blob], fileName, { type: fileType });
}

/**
 * Opens the Google Picker restricted to CSV, Excel, and native Google Sheets,
 * asks for a one-time `drive.file` grant if needed, and returns the chosen
 * file's bytes as a `File` - or `null` if the user closes the picker without
 * choosing anything.
 */
export async function pickGoogleDriveFile(): Promise<File | null> {
  await Promise.all([ensureGis(), ensurePicker()]);
  const accessToken = await requestAccessToken();
  const doc = await showPicker(accessToken);
  if (!doc) return null;
  return downloadDoc(doc, accessToken);
}
