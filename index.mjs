import fs from 'fs/promises';
import path, { resolve } from 'path';
import snakeCase from 'lodash/snakeCase.js';
import { fileURLToPath } from 'url';

const FILES_FOLDER = './wordnet-files';
const filenames = await fs.readdir(FILES_FOLDER);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const parseWordnetFile = (lines) => {
  lines = lines.trim().split('\n').map((t) => ({
    text: t,
    children: [],
  }));
  const getTabsCount = (str) => (str.match(new RegExp('\t', 'g')) || []).length;

  const newLines = [];
  let currentTabCount = 0;
  let currentList = [];
  const lists = [];

  lines.forEach((line) => {
    const tabCount = getTabsCount(line.text);
    line.text = snakeCase(
      line.text.split('(')[0].trim(),
    );

    if (tabCount === currentTabCount) {
      if (lists[tabCount - 1]) {
        lists[tabCount - 1].push(line);
      }
    }

    if (tabCount > currentTabCount) {
      // deeper
      currentList.push(line);
      currentList = line.children;
    }

    if (tabCount < currentTabCount) {
      currentList = lists[tabCount - 1];
      if (!currentList) {
        newLines.push(line);
        currentList = line.children;
      } else {
        currentList.push(line);
      }
    }

    if (tabCount === 0) {
      newLines.push(line);
      currentList = line.children;
      lists[tabCount] = currentList;
    }

    lists[tabCount] = line.children;
    currentTabCount = tabCount;
  });

  return newLines;
};

const getContents = async (filename) => (
  (await fs.readFile(
    resolve(
      FILES_FOLDER,
      filename,
    ),
  )).toString()
);

const parsedNodes = new Set();
const createFiles = (nodes, currentPath = '', parentNode) => {
  nodes.forEach(async (node, index) => {
    const nodePath = `${currentPath}${snakeCase(node.text)}/`;
    const isLastNode = !node.children.length;

    if (isLastNode) {
      if (parsedNodes.has(parentNode)) return;

      const wildcards = parentNode.children.map((node) => (
        node.text.replace(/_/g, ' ')
      )).join('\n');

      parsedNodes.add(parentNode);

      const fullPath = resolve(
        __dirname,
        'wordnet',
        currentPath,
      );

      await fs.mkdir(fullPath, {
        recursive: true,
      });

      await fs.writeFile(
        resolve(fullPath, `${parentNode.text}.txt`),
        wildcards,
      );
      return;
    }

    createFiles(node.children, nodePath, node);
  });
};

filenames.forEach(async (filename) => {
  const content = await getContents(filename);

  await createFiles(
    parseWordnetFile(
      content,
    ),
  );
});
