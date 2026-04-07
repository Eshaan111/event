import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    
    // Optional filters
    const type = searchParams.get('type');
    const status = searchParams.get('status');

    const where: any = {};
    if (type) where.type = type;
    if (status) where.status = status;

    const proposals = await prisma.proposal.findMany({
      where,
      include: {
        authors: true,
        tags: true,
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(proposals);
  } catch (error) {
    console.error('Error fetching proposals:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
