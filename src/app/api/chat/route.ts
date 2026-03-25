import { NextRequest, NextResponse } from 'next/server';
import { createChatCompletion, createStreamingChatCompletion } from '@/lib/openai';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { messages, stream = false, model = 'gpt-4' } = body;

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: 'Messages array is required' },
        { status: 400 }
      );
    }

    // Add system message for Zaina AI personality
    const systemMessage = {
      role: 'system' as const,
      content: `You are Zaina, a friendly and helpful AI shopping assistant for Zain Bahrain's e-commerce store.

Your role:
- Help customers find phones, plans, and accessories from Zain Bahrain
- Provide product recommendations based on their needs and budget
- Answer questions about devices, specifications, and plans
- Be conversational, friendly, and enthusiastic about technology
- Always mention prices in Bahraini Dinars (BD)

Guidelines:
- Keep responses concise and helpful
- Ask clarifying questions if needed
- Recommend products available on eshop.bh.zain.com
- Focus on popular brands like Apple, Samsung, and other devices available at Zain`
    };

    const fullMessages = [systemMessage, ...messages];

    // Handle streaming response
    if (stream) {
      const stream = await createStreamingChatCompletion(fullMessages, model);

      return new Response(stream.toReadableStream(), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });
    }

    // Handle regular response
    const response = await createChatCompletion(fullMessages, model, 0.7);

    return NextResponse.json({
      message: response.choices[0]?.message?.content || '',
      model: response.model,
      usage: response.usage
    });

  } catch (error: any) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to process chat request' },
      { status: 500 }
    );
  }
}
