This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

### Prerequisites

1. Install dependencies:

   ```bash
   npm install
   ```

2. Install Firebase CLI globally:
   ```bash
   npm install -g firebase-tools
   ```

### Development with Emulator

1. Start the Firebase emulators:

   ```bash
   npm run emulators
   ```

2. In a new terminal, seed the emulator with sample data:

   ```bash
   npm run seed
   ```

3. Start the development server:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

### Emulator Management

- **Check emulator status**: `npm run emulator:status`
- **Clear all data**: `npm run emulator:clear`
- **Get data summary**: `npm run emulator:summary`
- **Seed with sample data**: `npm run seed`

### Emulator URLs

- **Firestore**: http://localhost:8080
- **Auth**: http://localhost:9099
- **Emulator UI**: http://localhost:4000

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Deployment Status

✅ Project configured for Vercel deployment with stable dependencies
✅ Build tested locally and working correctly
✅ Ready for production deployment

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
