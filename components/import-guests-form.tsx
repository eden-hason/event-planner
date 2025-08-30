'use client';

import { useActionState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { toast } from 'sonner';
import { importGuestsFromCSV, ImportResult } from '@/app/actions/guests';
import { useState } from 'react';
import { Download } from 'lucide-react';

interface ImportGuestsFormProps {
  eventId: string;
  onSuccess?: () => void;
}

const downloadSampleCSV = () => {
  const csvContent = `name,phone,group,rsvpStatus,amount,notes,dietaryRestrictions
John Doe,+1234567890,Family,confirmed,2,Close friend,None
Jane Smith,+1987654321,Work,pending,1,Colleague,Vegetarian
Mike Johnson,+1122334455,Friends,declined,0,Can't make it,None`;

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'sample-guests.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};

export function ImportGuestsForm({
  eventId,
  onSuccess,
}: ImportGuestsFormProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [state, formAction, isPending] = useActionState(
    async (prevState: ImportResult, formData: FormData) => {
      try {
        setIsProcessing(true);

        // Get the file from form data
        const file = formData.get('csvFile') as File;
        if (!file) {
          return { success: false, message: 'Please select a CSV file' };
        }

        // Call server action
        const result = await importGuestsFromCSV(eventId, file);

        if (result.success) {
          toast.success(result.message);
          setSelectedFile(null);
          onSuccess?.();
        } else {
          toast.error(result.message);
        }

        return result;
      } catch (error) {
        console.error('CSV import error:', error);
        return { success: false, message: 'An unexpected error occurred' };
      } finally {
        setIsProcessing(false);
      }
    },
    { success: false, message: '' },
  );

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else if (file) {
      toast.error('Please select a valid CSV file');
      e.target.value = '';
    }
  };

  return (
    <form action={formAction} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="csvFile">CSV File</Label>
        <Input
          id="csvFile"
          name="csvFile"
          type="file"
          accept=".csv"
          onChange={handleFileChange}
          required
        />
        <div className="flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={downloadSampleCSV}
            className="flex items-center space-x-1"
          >
            <Download className="w-3 h-3" />
            <span>Sample CSV</span>
          </Button>
        </div>
      </div>

      {selectedFile && (
        <div className="p-3 bg-muted rounded-md">
          <p className="text-sm font-medium">
            Selected file: {selectedFile.name}
          </p>
          <p className="text-xs text-muted-foreground">
            Size: {(selectedFile.size / 1024).toFixed(1)} KB
          </p>
        </div>
      )}

      <div className="flex justify-end space-x-2">
        <Button
          type="submit"
          disabled={isPending || isProcessing || !selectedFile}
        >
          {isPending || isProcessing ? 'Importing...' : 'Import Guests'}
        </Button>
      </div>
    </form>
  );
}
