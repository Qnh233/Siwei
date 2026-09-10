import type { LibraryDocumentItem } from '../../types/library'

export interface LibraryFolderNode {
  name: string
  path: string
  documents: LibraryDocumentItem[]
  children: LibraryFolderNode[]
}

export interface LibraryFolderTree {
  root: LibraryFolderNode
  externalDocuments: LibraryDocumentItem[]
}

interface MutableFolderNode {
  name: string
  path: string
  documents: LibraryDocumentItem[]
  children: Map<string, MutableFolderNode>
}

export function buildLibraryFolderTree(
  docs: LibraryDocumentItem[],
  libraryRoot: string,
  directoryPaths: string[] = [],
): LibraryFolderTree {
  const normalizedRoot = normalizePath(libraryRoot)
  const rootDocuments: LibraryDocumentItem[] = []
  const externalDocuments: LibraryDocumentItem[] = []
  const rootFolders = new Map<string, MutableFolderNode>()

  for (const directoryPath of directoryPaths) {
    ensureFolder(rootFolders, normalizePath(directoryPath).split('/').filter(Boolean))
  }

  for (const doc of docs) {
    const relativePath = relativePathWithinRoot(doc.path, normalizedRoot)
    if (relativePath === null) {
      externalDocuments.push(doc)
      continue
    }

    const segments = relativePath.split('/').filter(Boolean)
    const folderSegments = segments.slice(0, -1)
    if (folderSegments.length === 0) {
      rootDocuments.push(doc)
      continue
    }

    ensureFolder(rootFolders, folderSegments)?.documents.push(doc)
  }

  return {
    root: {
      name: folderName(normalizedRoot),
      path: normalizedRoot || '__library_root__',
      documents: rootDocuments,
      children: freezeFolders(rootFolders),
    },
    externalDocuments,
  }
}

function ensureFolder(
  rootFolders: Map<string, MutableFolderNode>,
  segments: string[],
): MutableFolderNode | undefined {
  let siblings = rootFolders
  let currentPath = ''
  let current: MutableFolderNode | undefined
  for (const segment of segments) {
    currentPath = currentPath ? `${currentPath}/${segment}` : segment
    current = siblings.get(segment)
    if (!current) {
      current = { name: segment, path: currentPath, documents: [], children: new Map() }
      siblings.set(segment, current)
    }
    siblings = current.children
  }
  return current
}

function relativePathWithinRoot(path: string, normalizedRoot: string): string | null {
  const normalizedPath = normalizePath(path)
  if (!normalizedRoot) return null

  const windowsPath = /^[A-Za-z]:\//.test(normalizedPath) || /^[A-Za-z]:\//.test(normalizedRoot)
  const comparablePath = windowsPath ? normalizedPath.toLowerCase() : normalizedPath
  const comparableRoot = windowsPath ? normalizedRoot.toLowerCase() : normalizedRoot
  const prefix = `${comparableRoot}/`

  if (!comparablePath.startsWith(prefix)) return null
  return normalizedPath.slice(normalizedRoot.length + 1)
}

function normalizePath(path: string): string {
  return path.replace(/\\/g, '/').replace(/\/{2,}/g, '/').replace(/\/$/, '')
}

function folderName(path: string): string {
  const segments = path.split('/').filter(Boolean)
  return segments[segments.length - 1] || '文档库'
}

function freezeFolders(folders: Map<string, MutableFolderNode>): LibraryFolderNode[] {
  return [...folders.values()]
    .sort((left, right) => left.name.localeCompare(right.name))
    .map((folder) => ({
      name: folder.name,
      path: folder.path,
      documents: folder.documents,
      children: freezeFolders(folder.children),
    }))
}
