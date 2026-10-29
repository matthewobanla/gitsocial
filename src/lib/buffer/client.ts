export interface BufferOrganization {
  id: string;
  name: string;
  isOwner?: boolean;
}

export interface BufferChannel {
  id: string;
  name: string;
  service: string;
  serviceId?: string;
  avatar?: string;
}

export interface BufferPostResult {
  id: string;
  text?: string;
  state?: string;
  scheduledAt?: string;
  channel?: {
    id: string;
    name: string;
    service: string;
  };
}

export interface CreatePostParams {
  channelId: string;
  text: string;
  mediaUrls?: string[];
  scheduledAt?: string;
  saveToDraft?: boolean;
}

interface GraphQLError {
  message: string;
}

export class BufferClient {
  private accessToken: string;
  private endpoint = 'https://api.buffer.com';

  constructor(accessToken: string) {
    this.accessToken = accessToken;
  }

  private async executeQuery<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(this.endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.accessToken}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      if (response.status === 429) {
        const retryAfter = response.headers.get('Retry-After');
        throw new Error(`Buffer API rate limit reached. Retry after ${retryAfter || 'a few'} seconds.`);
      }
      throw new Error(`Buffer API HTTP Error ${response.status}: ${errorText}`);
    }

    const json = await response.json();
    if (json.errors && json.errors.length > 0) {
      throw new Error(`Buffer GraphQL Error: ${json.errors.map((e: GraphQLError) => e.message).join(', ')}`);
    }

    return json.data as T;
  }

  /**
   * Retrieves the current user's organizations
   */
  async getOrganizations(): Promise<BufferOrganization[]> {
    const query = `
      query GetAccount {
        account {
          id
          name
          email
          organizations {
            id
            name
          }
        }
      }
    `;
    const data = await this.executeQuery<{ account?: { organizations?: BufferOrganization[] } }>(query);
    return data.account?.organizations || [];
  }

  /**
   * Retrieves channels connected to a specific organization
   */
  async getChannels(organizationId: string): Promise<BufferChannel[]> {
    const query = `
      query GetChannels($organizationId: OrganizationId!) {
        channels(organizationId: $organizationId) {
          id
          name
          service
          serviceId
          avatar
        }
      }
    `;
    const data = await this.executeQuery<{ channels?: BufferChannel[] }>(query, { organizationId });
    return data.channels || [];
  }

  /**
   * Creates a post or draft across one or more channels
   */
  async createPost(params: CreatePostParams): Promise<BufferPostResult> {
    const mutation = `
      mutation CreatePost($input: CreatePostInput!) {
        createPost(input: $input) {
          post {
            id
            text
            state
            scheduledAt
            channel {
              id
              name
              service
            }
          }
        }
      }
    `;

    const input: Record<string, unknown> = {
      channelId: params.channelId,
      text: params.text,
      saveToDraft: params.saveToDraft ?? true,
    };

    if (params.scheduledAt) {
      input.scheduledAt = params.scheduledAt;
    }

    if (params.mediaUrls && params.mediaUrls.length > 0) {
      input.assets = {
        images: params.mediaUrls.map((url) => ({ url })),
      };
    }

    const data = await this.executeQuery<{ createPost?: { post?: BufferPostResult } }>(mutation, { input });
    if (!data.createPost?.post) {
      throw new Error('Failed to create post on Buffer: empty response');
    }

    return data.createPost.post;
  }
}
