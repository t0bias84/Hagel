// Component for creating a new load
// ... existing code ...
// Error handling
setError("An error occurred while creating the load.");
// ... existing code ...
// Success message
setMessage("Load created successfully!");
// ... existing code ...
{/* Error message */}
{error && (
  <Alert variant="destructive">
    <AlertCircle className="h-4 w-4" />
    <AlertTitle>Error</AlertTitle>
    <AlertDescription>{error}</AlertDescription>
  </Alert>
)}
// ... existing code ...
{/* Success message */}
{message && (
  <Alert>
    <CheckCircle2 className="h-4 w-4" />
    <AlertTitle>Success</AlertTitle>
    <AlertDescription>{message}</AlertDescription>
  </Alert>
)}
// ... existing code ... 