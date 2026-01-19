import { NextRequest, NextResponse } from 'next/server';
import { extractTextFromImage } from '@/lib/openai';

export const maxDuration = 60;

// Simple text extraction for common document types
async function extractTextFromFile(file: File): Promise<string> {
  const fileType = file.type;
  const fileName = file.name.toLowerCase();

  // Plain text files
  if (fileType === 'text/plain' || fileName.endsWith('.txt')) {
    return await file.text();
  }

  // For PDF and images, convert to base64 and use GPT-4 Vision
  if (
    fileType === 'application/pdf' ||
    fileType.startsWith('image/') ||
    fileName.endsWith('.pdf')
  ) {
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');
    const mimeType = fileType || 'application/octet-stream';
    const dataUrl = `data:${mimeType};base64,${base64}`;

    // Use GPT-4 Vision to extract text
    const extractedText = await extractTextFromImage(dataUrl);
    return extractedText;
  }

  // For Word documents (.docx), we'll extract basic text
  // Note: For production, consider using a library like mammoth.js
  if (
    fileType === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    fileName.endsWith('.docx')
  ) {
    // For POC, we'll use GPT-4 Vision approach
    // In production, you'd want to use mammoth.js or similar
    const buffer = await file.arrayBuffer();
    const base64 = Buffer.from(buffer).toString('base64');

    // Try to extract as binary, GPT-4 can sometimes understand docx
    // For better results, convert to PDF first or use mammoth.js
    return `[Document: ${file.name}]\n\nNote: For best results with Word documents, please convert to PDF first. Basic extraction attempted.`;
  }

  throw new Error(`Unsupported file type: ${fileType}`);
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('document') as File | null;

    if (!file) {
      return NextResponse.json(
        { error: 'No document file provided' },
        { status: 400 }
      );
    }

    // Check file size (max 20MB)
    if (file.size > 20 * 1024 * 1024) {
      return NextResponse.json(
        { error: 'Document too large. Maximum size is 20MB.' },
        { status: 400 }
      );
    }

    // Extract text from the document
    const extractedText = await extractTextFromFile(file);

    return NextResponse.json({
      success: true,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
      extractedText,
    });
  } catch (error) {
    console.error('Document extraction error:', error);
    return NextResponse.json(
      { error: 'Failed to extract document content' },
      { status: 500 }
    );
  }
}
