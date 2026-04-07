import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const proposal = await prisma.proposal.findUnique({
      where: {
        id,
      },
      include: {
        authors: true,
        tags: true,
      },
    });

    if (!proposal) {
      return NextResponse.json({ error: 'Proposal not found' }, { status: 404 });
    }

    return NextResponse.json(proposal);
  } catch (error) {
    console.error('Error fetching proposal:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
