export const SanitizeData = (str) => {
  if (typeof str !== "string") {
    return str; // If the input is not a string, return it as-is
  }

  const charMap = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
    "/": "&#x2F;",
    "`": "&#x60;",
    "=": "&#x3D;",
    "-": "&#45;",
  };

  // Replace individual characters and then handle `--`
  return str
    .replace(/[&<>"'`=\/-]/g, (match) => charMap[match])
    .replace(/--/g, "&#45;&#45;"); // Specifically escape double dashes
};
