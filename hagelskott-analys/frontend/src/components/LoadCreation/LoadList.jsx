// Component for displaying a list of loads
// ... existing code ...
// Error handling
console.error("Error fetching loads:", error);
setError("Could not fetch loads.");
// ... existing code ...
{/* Loading state */}
{isLoading && <p>Loading loads...</p>}
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
{/* No loads message */}
{!isLoading && loads.length === 0 && (
  <p>No loads found. Create your first load!</p>
)}
// ... existing code ... 