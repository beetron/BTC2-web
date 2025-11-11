/**
 * Image Validation Utility
 * Validates file size and type for message uploads
 */

const MAX_FILE_SIZE = 49 * 1024 * 1024; // 49MB (Backend limit is 50MB)
const MAX_FILES = 10;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

/**
 * Validate selected image files
 * @param files - Array of files to validate
 * @returns Validation result with errors if any
 */
export const validateImageFiles = (files: File[]): ValidationResult => {
  const errors: string[] = [];

  if (files.length === 0) {
    errors.push("No files selected");
    return { isValid: false, errors };
  }

  if (files.length > MAX_FILES) {
    errors.push(
      `Maximum ${MAX_FILES} files allowed, you selected ${files.length}`
    );
  }

  files.forEach((file, index) => {
    // Check file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      errors.push(
        `File ${index + 1} (${
          file.name
        }): Invalid file type. Only JPEG, PNG, GIF, and WebP are allowed`
      );
    }

    // Check file size
    if (file.size > MAX_FILE_SIZE) {
      const sizeMB = (file.size / (1024 * 1024)).toFixed(2);
      errors.push(
        `File ${index + 1} (${
          file.name
        }): File size ${sizeMB}MB exceeds 30MB limit`
      );
    }
  });

  return {
    isValid: errors.length === 0,
    errors,
  };
};

/**
 * Calculate total size of files
 */
export const calculateTotalSize = (files: File[]): string => {
  const totalBytes = files.reduce((sum, file) => sum + file.size, 0);
  return (totalBytes / (1024 * 1024)).toFixed(2);
};
