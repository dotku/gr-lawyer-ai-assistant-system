'use server';

import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { IntakeStatus } from '@prisma/client';

// Type definitions
interface IntakeInput {
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  category?: string;
  tags?: string[];
}

interface ScheduleInput {
  title: string;
  date: Date;
  time: string;
  meetingLink?: string;
  type: string;
}

interface NoticeInput {
  content: string;
  isStarred?: boolean;
}

interface QuestionInput {
  question: string;
  answer?: string;
  fileUrl?: string;
}

interface NoteInput {
  content: string;
}

// Generate unique intake number
async function generateIntakeNumber(): Promise<string> {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');

  // Find the last intake number for this month
  const lastIntake = await prisma.intake.findFirst({
    where: {
      intakeNumber: {
        startsWith: `INT-${year}${month}`,
      },
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  let sequence = 1;
  if (lastIntake) {
    const lastSequence = parseInt(lastIntake.intakeNumber.split('-')[2]);
    sequence = lastSequence + 1;
  }

  return `INT-${year}${month}-${String(sequence).padStart(4, '0')}`;
}

// Get all intakes with optional filtering
export async function getIntakes(filter?: IntakeStatus) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const intakes = await prisma.intake.findMany({
    where: {
      ...(filter && { status: filter }),
      assignedToId: session.user.id,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      schedules: {
        orderBy: { date: 'asc' },
      },
      notices: {
        orderBy: { createdAt: 'desc' },
      },
      questions: {
        orderBy: { createdAt: 'asc' },
      },
      notes: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return intakes;
}

// Get intake counts by status
export async function getIntakeCounts() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const [all, newCount, processing, needReview, sent, archived] = await Promise.all([
    prisma.intake.count({
      where: { assignedToId: session.user.id },
    }),
    prisma.intake.count({
      where: { assignedToId: session.user.id, status: 'NEW' },
    }),
    prisma.intake.count({
      where: { assignedToId: session.user.id, status: 'PROCESSING' },
    }),
    prisma.intake.count({
      where: { assignedToId: session.user.id, status: 'NEED_REVIEW' },
    }),
    prisma.intake.count({
      where: { assignedToId: session.user.id, status: 'SENT' },
    }),
    prisma.intake.count({
      where: { assignedToId: session.user.id, status: 'ARCHIVED' },
    }),
  ]);

  return {
    all,
    new: newCount,
    processing,
    needReview,
    sent,
    archived,
  };
}

// Get single intake by ID
export async function getIntakeById(id: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const intake = await prisma.intake.findUnique({
    where: { id },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      schedules: {
        orderBy: { date: 'asc' },
      },
      notices: {
        orderBy: { createdAt: 'desc' },
      },
      questions: {
        orderBy: { createdAt: 'asc' },
      },
      notes: {
        include: {
          author: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      },
      convertedCase: {
        select: {
          id: true,
          caseNumber: true,
          title: true,
        },
      },
    },
  });

  if (!intake) {
    throw new Error('Intake not found');
  }

  // Check if user has access
  if (intake.assignedToId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  return intake;
}

// Create new intake
export async function createIntake(data: IntakeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const intakeNumber = await generateIntakeNumber();

  const intake = await prisma.intake.create({
    data: {
      intakeNumber,
      clientName: data.clientName,
      clientEmail: data.clientEmail,
      clientPhone: data.clientPhone,
      category: data.category,
      tags: data.tags || [],
      assignedToId: session.user.id,
    },
    include: {
      assignedTo: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  revalidatePath('/[locale]/intake');
  return intake;
}

// Update intake
export async function updateIntake(id: string, data: Partial<IntakeInput> & { status?: IntakeStatus }) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const existing = await prisma.intake.findUnique({
    where: { id },
    select: { assignedToId: true },
  });

  if (!existing || existing.assignedToId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const intake = await prisma.intake.update({
    where: { id },
    data: {
      ...(data.clientName && { clientName: data.clientName }),
      ...(data.clientEmail && { clientEmail: data.clientEmail }),
      ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
      ...(data.category !== undefined && { category: data.category }),
      ...(data.tags && { tags: data.tags }),
      ...(data.status && { status: data.status }),
    },
  });

  revalidatePath('/[locale]/intake');
  revalidatePath(`/[locale]/intake/${id}`);
  return intake;
}

// Add schedule to intake
export async function addIntakeSchedule(intakeId: string, schedule: ScheduleInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    select: { assignedToId: true },
  });

  if (!intake || intake.assignedToId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const newSchedule = await prisma.intakeSchedule.create({
    data: {
      intakeId,
      title: schedule.title,
      date: schedule.date,
      time: schedule.time,
      meetingLink: schedule.meetingLink,
      type: schedule.type,
    },
  });

  revalidatePath(`/[locale]/intake/${intakeId}`);
  return newSchedule;
}

// Add notice to intake
export async function addIntakeNotice(intakeId: string, notice: NoticeInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    select: { assignedToId: true },
  });

  if (!intake || intake.assignedToId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const newNotice = await prisma.intakeNotice.create({
    data: {
      intakeId,
      content: notice.content,
      isStarred: notice.isStarred || false,
    },
  });

  revalidatePath(`/[locale]/intake/${intakeId}`);
  return newNotice;
}

// Add question to intake
export async function addIntakeQuestion(intakeId: string, question: QuestionInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    select: { assignedToId: true },
  });

  if (!intake || intake.assignedToId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const newQuestion = await prisma.intakeQuestion.create({
    data: {
      intakeId,
      question: question.question,
      answer: question.answer,
      fileUrl: question.fileUrl,
    },
  });

  revalidatePath(`/[locale]/intake/${intakeId}`);
  return newQuestion;
}

// Add note to intake
export async function addIntakeNote(intakeId: string, note: NoteInput) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  // Verify ownership
  const intake = await prisma.intake.findUnique({
    where: { id: intakeId },
    select: { assignedToId: true },
  });

  if (!intake || intake.assignedToId !== session.user.id) {
    throw new Error('Unauthorized');
  }

  const newNote = await prisma.intakeNote.create({
    data: {
      intakeId,
      content: note.content,
      authorId: session.user.id,
    },
    include: {
      author: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  });

  revalidatePath(`/[locale]/intake/${intakeId}`);
  return newNote;
}

// Generate AI summary for intake
export async function generateIntakeSummary(intakeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const intake = await getIntakeById(intakeId);

  // Mock AI summary generation for now
  // TODO: Integrate with OpenAI API later
  const summary = `Client ${intake.clientName} has contacted regarding ${intake.category || 'legal matters'}.
Initial intake completed with ${intake.questions.length} questions addressed and ${intake.schedules.length} meetings scheduled.`;

  const updated = await prisma.intake.update({
    where: { id: intakeId },
    data: { summary },
  });

  revalidatePath(`/[locale]/intake/${intakeId}`);
  return updated;
}

// Convert intake to case
export async function convertIntakeToCase(intakeId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error('Unauthorized');
  }

  const intake = await getIntakeById(intakeId);

  if (intake.status === 'CONVERTED') {
    throw new Error('Intake already converted to case');
  }

  // Check if client exists
  let client = await prisma.client.findUnique({
    where: { email: intake.clientEmail },
  });

  // Create client if doesn't exist
  if (!client) {
    const [firstName, ...lastNameParts] = intake.clientName.split(' ');
    client = await prisma.client.create({
      data: {
        firstName,
        lastName: lastNameParts.join(' ') || firstName,
        email: intake.clientEmail,
        phone: intake.clientPhone,
      },
    });
  }

  // Generate case number
  const year = new Date().getFullYear();
  const caseCount = await prisma.case.count();
  const caseNumber = `CASE-${year}-${String(caseCount + 1).padStart(5, '0')}`;

  // Create case
  const newCase = await prisma.case.create({
    data: {
      caseNumber,
      title: `${intake.category || 'Legal Matter'} - ${intake.clientName}`,
      description: intake.summary || undefined,
      caseType: intake.category || 'General',
      clientId: client.id,
      assignedToId: session.user.id,
    },
  });

  // Update intake status and link to case
  await prisma.intake.update({
    where: { id: intakeId },
    data: {
      status: 'CONVERTED',
      convertedCaseId: newCase.id,
    },
  });

  revalidatePath('/[locale]/intake');
  revalidatePath(`/[locale]/intake/${intakeId}`);

  return newCase;
}
