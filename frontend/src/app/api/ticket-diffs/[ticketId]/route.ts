import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

interface DiffFile {
  id: string;
  filePath: string;
  diff: string;
  additions: number;
  deletions: number;
}

function parseDiffMetadata(content: string, fallbackFilePath: string): {
  filePath: string;
  additions: number;
  deletions: number;
} {
  const lines = content.split('\n');
  let filePath = fallbackFilePath;

  for (const line of lines) {
    if (line.startsWith('diff --git')) {
      const match = line.match(/^diff --git a\/(.+?) b\//);
      if (match && match[1]) {
        filePath = match[1];
        break;
      }
    }
    if (line.startsWith('+++ b/')) {
      const match = line.match(/^\+\+\+ b\/(.+)/);
      if (match && match[1]) {
        filePath = match[1];
        break;
      }
    }
  }

  let additions = 0;
  let deletions = 0;

  for (const line of lines) {
    if (!line || line.length === 0) continue;
    if (line.startsWith('+++') || line.startsWith('---') || line.startsWith('diff --git')) continue;
    if (line[0] === '+') additions += 1;
    if (line[0] === '-') deletions += 1;
  }

  return { filePath, additions, deletions };
}

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ ticketId: string }> }
) {
  const { ticketId } = await context.params;

  try {
    const backendRoot = path.resolve(process.cwd(), '..', 'backend');
    const diffsDir = path.join(backendRoot, 'tickets', ticketId, '.diffs');

    if (!fs.existsSync(diffsDir) || !fs.statSync(diffsDir).isDirectory()) {
      return NextResponse.json({ diffs: [] satisfies DiffFile[] });
    }

    const fileNames = fs
      .readdirSync(diffsDir)
      .filter((name) => name.toLowerCase().endsWith('.diff'));

    const diffs: DiffFile[] = fileNames.map((fileName) => {
      const fullPath = path.join(diffsDir, fileName);
      const content = fs.readFileSync(fullPath, 'utf8');
      const fallbackPath = fileName.replace(/\.diff$/i, '');
      const { filePath, additions, deletions } = parseDiffMetadata(content, fallbackPath);

      return {
        id: fileName,
        filePath,
        diff: content,
        additions,
        deletions,
      };
    });

    return NextResponse.json({ diffs });
  } catch (error) {
    console.error('Error reading ticket diffs:', error);
    return NextResponse.json(
      {
        error: 'Failed to read ticket diffs',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}


