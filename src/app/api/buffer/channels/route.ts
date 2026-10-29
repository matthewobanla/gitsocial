import { NextResponse } from 'next/server';
import { BufferClient } from '@/lib/buffer/client';
import { getBufferToken } from '@/lib/session';

export async function GET() {
  const token = await getBufferToken();

  if (!token) {
    return NextResponse.json({
      connected: false,
      channels: [],
      organizations: [],
    });
  }

  try {
    const client = new BufferClient(token);
    const organizations = await client.getOrganizations();

    if (organizations.length === 0) {
      return NextResponse.json({
        connected: true,
        organizations: [],
        channels: [],
      });
    }

    // Default to the first organization
    const orgId = organizations[0].id;
    const channels = await client.getChannels(orgId);

    return NextResponse.json({
      connected: true,
      organizations,
      selectedOrganizationId: orgId,
      channels,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to communicate with Buffer API';
    console.error('Failed to load Buffer channels:', message);
    return NextResponse.json(
      { connected: false, error: message },
      { status: 500 }
    );
  }
}
