import fs from "fs";
import { cwd } from "process";
import path from "path";
import Handlebars from "handlebars";

// Retrieve the current working directory, assuming it's the project root
const projectRoot = cwd();
// Helper to compare values in Handlebars
Handlebars.registerHelper("eq", (a, b) => a === b);

// Function to load and compile the Handlebars template
const getFullPath = (relativePath) => path.join(projectRoot, relativePath);

export const loadTemplate = (filePath) => {
  const templateSource = fs.readFileSync(getFullPath(filePath), "utf-8");
  return Handlebars.compile(templateSource);
};
