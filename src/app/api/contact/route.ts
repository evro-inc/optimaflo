import { NextRequest, NextResponse } from 'next/server';
import Plunk from '@plunk/node';
import { render } from '@react-email/render';
import WelcomeEmail from '@/src/components/server/emails/WelcomeTemplate';

// This function handles an HTTP POST request
export async function POST(request: NextRequest) {
  try {
    const apiSecret = process.env.PLUNK_API_SECRET;
    if (!apiSecret) {
      throw new Error('PLUNK_API_SECRET is not set');
    }

    const plunk = new Plunk(apiSecret);
    const json = await request.json();

    // Validate required fields
    if (!json.email || !json.name) {
      throw new Error('Email and name are required');
    }

    const emailHtml = render(WelcomeEmail());

    // Send user email
    await plunk.emails.send({
      to: json.email,
      subject: json.name,
      body: emailHtml,
    });

    // Send admin email
    await plunk.emails.send({
      to: 'optimaflo@gmail.com',
      subject: 'New User',
      body: `New user ${json.name} with email ${json.email} has signed up for OptimaFlo. ${json.message}`,
    });

    return NextResponse.json({ message: 'Email sent' }, { status: 200 });
  } catch (error) {
    return NextResponse.error(); // Optionally, add a custom message or status code
  }
}
