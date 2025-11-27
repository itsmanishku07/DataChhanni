# CSV Data Manager - Setup & Configuration Guide

## Prerequisites

1. **Node.js** (v18 or higher)
2. **MongoDB** (local or cloud instance)
3. **npm** or **yarn** package manager

## Installation Steps

### 1. Install Dependencies

```bash
cd csv-data-manager
npm install
```

### 2. Start MongoDB

**Option A: Local MongoDB**
```bash
mongod
```

**Option B: Docker**
```bash
docker run -d -p 27017:27017 --name mongodb mongo
```

**Option C: MongoDB Atlas (Cloud)**
- Create account at https://www.mongodb.com/cloud/atlas
- Create a cluster
- Get connection string

### 3. Start the Application

```bash
npm run dev
```

The app will be available at: http://localhost:3000

## First-Time Configuration

### Step 1: Open Settings
1. Navigate to http://localhost:3000
2. Click the **⚙️ Settings icon** in the top-right corner

### Step 2: Configure MongoDB Connection

**For Local MongoDB:**
- **MongoDB URI**: `mongodb://localhost:27017`
- **Database Name**: `csvdatamanager` (or any name you prefer)

**For MongoDB Atlas:**
- **MongoDB URI**: `mongodb+srv://username:password@cluster.mongodb.net`
- **Database Name**: `your-database-name`

**For Docker:**
- **MongoDB URI**: `mongodb://host.docker.internal:27017`
- **Database Name**: `csvdatamanager`

### Step 3: Test Connection
1. Click **"🔌 Test Connection"** button
2. Wait for verification
3. Success message will show: "Connection successful! Found X collection(s)"

### Step 4: Save Settings
1. Click **"💾 Save Settings"**
2. Page will automatically reload
3. Settings are stored in browser localStorage

## Troubleshooting

### Connection Errors

**Error: "Connection refused"**
- **Solution**: Make sure MongoDB is running
- Check: `mongod` process is active
- Verify: Port 27017 is not blocked

**Error: "Authentication failed"**
- **Solution**: Check username and password in connection string
- Format: `mongodb://username:password@host:port`

**Error: "Connection timeout"**
- **Solution**: Check network/firewall settings
- For Atlas: Whitelist your IP address in MongoDB Atlas dashboard

**Error: "Invalid connection string"**
- **Solution**: Verify URI format
- Local: `mongodb://localhost:27017`
- Atlas: `mongodb+srv://...`

### Settings Not Persisting

**Issue**: Settings disappear after refresh
- **Cause**: Browser localStorage is disabled or cleared
- **Solution**: 
  1. Enable localStorage in browser settings
  2. Don't use incognito/private mode
  3. Re-enter settings after clearing browser data

### Collections Not Loading

**Issue**: "MongoDB not configured" warning appears
- **Solution**: 
  1. Open Settings (⚙️)
  2. Verify connection details are saved
  3. Click "Test Connection" to verify
  4. Save settings again if needed

## Database Structure

The app creates collections dynamically based on your CSV uploads. Each collection stores:

```javascript
{
  _id: ObjectId,
  field1: value1,
  field2: value2,
  // ... your CSV columns
}
```

## Security Notes

1. **Connection String Storage**: 
   - Stored in browser localStorage
   - Only accessible on your local machine
   - Not sent to any external servers

2. **Production Deployment**:
   - Use environment variables for connection strings
   - Don't commit `.env` files to version control
   - Use MongoDB Atlas with IP whitelisting

3. **Best Practices**:
   - Use strong passwords
   - Enable MongoDB authentication
   - Use SSL/TLS for remote connections
   - Regularly backup your data

## Features Overview

### 📤 Upload CSV
- Import CSV files as MongoDB collections
- Automatic field detection
- Bulk data import

### 📊 View Data
- Table view with scrolling
- Graph visualization (Bar, Line, Pie charts)
- Toggle between views

### 🔍 Filter Data
- GUI filter builder (no coding required)
- JSON mode for advanced queries
- Multiple filter conditions
- Save filtered results as new collections

### ⚙️ Manage Fields
- Add new fields to collections
- Delete fields from collections
- Set default values
- Save modified collections separately

### ✏️ Update Data
- Update single or multiple fields
- Filter documents to update
- Bulk update operations
- Save updated data as new collection

### 🗂️ Manage Collections
- View all collections
- Delete collections
- Collection statistics

## MongoDB Query Examples

### Filter Examples (JSON Mode)

**Equal to:**
```json
{"status": "active"}
```

**Greater than:**
```json
{"age": {"$gt": 25}}
```

**Multiple conditions:**
```json
{"age": {"$gt": 20}, "city": "New York"}
```

**In array:**
```json
{"status": {"$in": ["active", "pending"]}}
```

**Not equal:**
```json
{"status": {"$ne": "deleted"}}
```

## Support & Resources

- **MongoDB Documentation**: https://docs.mongodb.com/
- **Next.js Documentation**: https://nextjs.org/docs
- **MongoDB Connection Strings**: https://docs.mongodb.com/manual/reference/connection-string/

## Quick Reference

### Default Ports
- Next.js App: `http://localhost:3000`
- MongoDB: `mongodb://localhost:27017`

### Key Files
- Settings Storage: Browser localStorage
- MongoDB Config: Settings modal (⚙️)
- API Routes: `/app/api/*`

### Common Commands

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Start MongoDB (if local)
mongod

# Check MongoDB status
mongo --eval "db.adminCommand('ping')"
```

## Need Help?

1. Check browser console for errors (F12)
2. Verify MongoDB is running
3. Test connection in Settings
4. Check MongoDB logs for connection attempts
5. Ensure firewall allows port 27017

---

**Version**: 1.0.0  
**Last Updated**: 2024
