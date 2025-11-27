# CSV Data Manager

A Next.js application for managing CSV data with MongoDB.

## Features

- 📤 Upload CSV files and store them as MongoDB collections
- 📊 View collection data in table or graph format
  - Interactive bar charts
  - Line charts for trends
  - Pie charts for distribution
- 🔍 Filter data using MongoDB query expressions
- 💾 Save filtered results as new collections
- ⚙️ Manage collection fields
  - Add new fields to all documents
  - Delete fields from all documents
  - View all existing fields
- ✏️ Update field data
  - Update single or multiple fields at once
  - Filter documents to update specific records
  - Bulk update all documents or targeted subset
- 🗂️ Manage collections
  - View all collections
  - Delete entire collections
- 🎨 Modern, responsive UI with dark theme

## Prerequisites

- Node.js installed
- MongoDB instance (local or cloud)
- MongoDB connection URI ready

## Setup

1. Install dependencies:
```bash
npm install
```

2. Run the development server:
```bash
npm run dev
```

3. Open [http://localhost:3000](http://localhost:3000)

4. **IMPORTANT:** Configure MongoDB connection in Settings (⚙️) before using the app

## Usage

### Configure MongoDB Connection (Required - First Time Setup)
1. Click the settings icon (⚙️) in the top right corner
2. Enter your MongoDB connection URI
   - Local: `mongodb://localhost:27017`
   - Atlas: `mongodb+srv://username:password@cluster.mongodb.net`
   - Docker: `mongodb://host.docker.internal:27017`
3. Enter your database name (e.g., csvdatamanager, mydb, etc.)
4. Click "🔌 Test Connection" to verify your connection (recommended)
   - Shows success message with collection count if valid
   - Shows specific error message if connection fails
5. Click "💾 Save Settings" - automatically tests connection before saving
   - Settings are stored in browser localStorage
   - The app will refresh and connect to your MongoDB instance
6. Click "🗑️ Remove Settings" to clear configuration and enter new credentials

### Upload CSV
1. Enter a collection name in the input field
2. Click "Choose File" and select a CSV file
3. Data will be uploaded to MongoDB

### View Data
1. Select a collection from the dropdown
2. Click "Load Data"
3. Toggle between Table and Graph views
   - Table: Scrollable data grid
   - Graph: Bar, Line, and Pie charts

### Filter Data
1. Select a collection from the dropdown
2. Enter a MongoDB filter expression (JSON format)
   - Example: `{"age": {"$gt": 25}}`
   - Leave empty to get all records
3. Click "Apply Filter"
4. Save filtered results as a new collection

### Manage Fields
1. Select a collection and click "Load Fields"
2. View all existing fields in the collection
3. Add new field:
   - Enter field name
   - Optionally set a default value
   - Click "Add Field"
4. Delete field:
   - Select field from dropdown
   - Click "Delete Field" (confirms before deletion)

### Update Field Data
1. Select a collection and click "Load Fields"
2. Optionally add a filter to target specific documents
   - Example: `{"status": "pending"}` to update only pending records
   - Leave empty to update all documents
3. Add field-value pairs:
   - Select field from dropdown
   - Enter new value
   - Click "+ Add Field" to update multiple fields at once
4. Click "Update Fields" to apply changes
5. View how many documents were matched and modified

### Manage Collections
1. View all available collections
2. Delete a collection:
   - Select collection from dropdown
   - Click "Delete Collection Permanently"
   - Confirm the deletion (cannot be undone)

## MongoDB Filter Examples

- Greater than: `{"age": {"$gt": 25}}`
- Equal to: `{"name": "John"}`
- Multiple conditions: `{"age": {"$gt": 20}, "city": "New York"}`
- In array: `{"status": {"$in": ["active", "pending"]}}`
