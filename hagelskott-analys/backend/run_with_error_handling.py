import sys
import traceback

try:
    import main
except Exception as e:
    print("\n\nERROR DETECTED:")
    print(f"Error type: {type(e).__name__}")
    print(f"Error message: {str(e)}")
    print("\nTraceback:")
    traceback.print_exc()
    print("\nPath information:")
    print(f"Python path: {sys.path}")
    
    input("\nPress Enter to exit...") 