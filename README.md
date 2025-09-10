# Driver Management System - Firebase Setup Guide

## Overview
This is a comprehensive driver management system with separate admin and driver portals, featuring authentication, punch in/out tracking, and return form management with automatic printing.

## Firebase Console Setup Instructions

### 1. Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Create a project" or "Add project"
3. Enter project name (e.g., "driver-management-system")
4. Enable Google Analytics (optional)
5. Create project

### 2. Enable Authentication
1. In Firebase Console, go to **Authentication** → **Get started**
2. Go to **Sign-in method** tab
3. Enable the following providers:
   - **Email/Password**: Click → Enable → Save
   - **Google** (optional): Click → Enable → Add your domain → Save

### 3. Create Firestore Database
1. Go to **Firestore Database** → **Create database**
2. Choose **Start in test mode** (we'll update rules later)
3. Select your preferred location
4. Click **Done**

### 4. Set Up Firestore Security Rules
1. Go to **Firestore Database** → **Rules**
2. Replace the default rules with:

\`\`\`javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read/write their own data, admins can read all
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
      allow read: if request.auth != null && 
        exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }
    
    // Punch records - drivers can create their own, admins can read all
    match /punchRecords/{recordId} {
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.driverId;
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.driverId ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
      );
    }
    
    // Return forms - drivers can create their own, admins can read all
    match /returnForms/{formId} {
      allow create: if request.auth != null && 
        request.auth.uid == resource.data.driverId;
      allow read: if request.auth != null && (
        request.auth.uid == resource.data.driverId ||
        (exists(/databases/$(database)/documents/users/$(request.auth.uid)) &&
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin')
      );
    }
  }
}
\`\`\`

3. Click **Publish**

### 5. Create Firestore Indexes
1. Go to **Firestore Database** → **Indexes**
2. Create the following composite indexes:

**Index 1: punchRecords**
- Collection ID: `punchRecords`
- Fields:
  - `driverId` (Ascending)
  - `createdAt` (Descending)

**Index 2: returnForms**
- Collection ID: `returnForms`
- Fields:
  - `driverId` (Ascending)
  - `createdAt` (Descending)

**Index 3: users by role**
- Collection ID: `users`
- Fields:
  - `role` (Ascending)
  - `createdAt` (Descending)

### 6. Get Firebase Configuration
1. Go to **Project Settings** (gear icon) → **General**
2. Scroll to **Your apps** section
3. Click **Web app** icon (`</>`)
4. Register app with nickname (e.g., "driver-management-web")
5. Copy the configuration object

### 7. Environment Variables Setup
Add these environment variables to your Vercel project or `.env.local`:

\`\`\`env
NEXT_PUBLIC_FIREBASE_API_KEY=your_api_key_here
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project_id.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project_id.appspot.com
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
NEXT_PUBLIC_FIREBASE_APP_ID=your_app_id
\`\`\`

## System Features

### Admin Portal
- **Protected Signup**: Requires admin password (`ADMIN_SECRET_2024`)
- **Driver Management**: View all drivers, their status, and punch records
- **Return Forms**: Monitor all return forms with reprint functionality
- **Real-time Dashboard**: Live updates of driver activities

### Driver Portal
- **Separate Authentication**: Independent signup/login from admin
- **PIN Management**: Set custom 4-digit PIN for punch-in security
- **Punch In/Out**: PIN required for punch-in, no PIN for punch-out
- **Return Forms**: Submit return requests with automatic printing
- **Dashboard**: View work status and recent activities

### Security Features
- **Role-based Access**: Separate admin and driver permissions
- **PIN Protection**: Secure punch-in with personal PIN codes
- **Firestore Rules**: Comprehensive security rules for data protection
- **Protected Routes**: Route guards for admin and driver areas

### Automatic Collections Creation
The system automatically creates the following Firestore collections when needed:
- `users`: User profiles with roles and settings
- `punchRecords`: Time tracking entries
- `returnForms`: Return request submissions

### Printer Integration
- **WiFi Printing**: Automatic printing of return forms
- **Network Printer Support**: Compatible with network-connected printers
- **Error Handling**: Graceful handling of printer connection issues

## Deployment Notes
1. Deploy Firestore security rules using Firebase CLI or console
2. Ensure all environment variables are set in production
3. Test printer connectivity in production environment
4. Verify all authentication flows work correctly

## Troubleshooting
- **Permission Denied**: Check Firestore security rules and user authentication
- **Document Not Found**: System automatically creates documents with `setDoc` merge
- **Printer Issues**: Verify network connectivity and printer IP configuration
- **Authentication Errors**: Ensure Firebase configuration is correct

## Admin Access
- Admin signup requires password: `ADMIN_SECRET_2024`
- First admin user should be created through the protected signup page
- Subsequent admins can be managed through the admin dashboard
\`\`\`

```javascript file="" isHidden
