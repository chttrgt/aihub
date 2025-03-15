export function sanitizeInput(str) {
  return String(str).replace(/[&<>"'/]/g, function (match) {
    const chars = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
      "/": "&#x2F;",
    };
    return chars[match];
  });
}

export function isValidUrl(url) {
  try {
    const parsedUrl = new URL(url);
    return ["http:", "https:"].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
}

export function validateFileUpload(file) {
  const maxSize = 500 * 1024;
  const allowedTypes = ["image/jpeg", "image/png", "image/gif"];

  if (file.size > maxSize) {
    throw new Error("File size must be less than 500KB");
  }
  if (!allowedTypes.includes(file.type)) {
    throw new Error("Only JPEG, PNG and GIF images are allowed");
  }
  return true;
}
