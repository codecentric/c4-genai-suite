import os
import shutil
from datetime import datetime
from pathlib import Path


def create_backup(filepath: str | Path) -> None:
    try:
        # Check if the file exists
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"The file '{filepath}' does not exist.")

        # Get the directory and filename
        directory, filename = os.path.split(filepath)

        # Generate the backup filename with timestamp
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_filename = f"backup_{timestamp}_{filename}"

        # Create the full backup filepath
        backup_filepath = os.path.join(directory, backup_filename)

        # Copy the original file to the backup location
        shutil.copy2(filepath, backup_filepath)

        print(f"Backup created successfully: {backup_filepath}")

    except FileNotFoundError as e:
        print(f"Error: {e}")
    except PermissionError:
        print(f"Error: Permission denied. Unable to create backup of '{filepath}'.")
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
