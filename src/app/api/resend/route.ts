import { Resend } from "resend";
import { NextRequest, NextResponse } from "next/server";
import { EmailTemplate } from "@/src/components/server/EmailTemplate";

const resend = new Resend(process.env.RESEND_API_KEY);
const fromEmail = process.env.NEXT_PUBLIC_FROM_EMAIL;
const siteName = process.env.NEXT_PUBLIC_SITE_NAME;
const audienceId = process.env.AUDIENCE_ID;
const siteUrl = process.env.NEXT_PUBLIC_DOMAIN;
const unsubscribeUrl = `${siteUrl}/unsubscribe`;
const subject = `You’re on the waitlist for ${siteName}`;

export async function POST(req: NextRequest) {
    const body = await req.json();

    console.log('body', body);

    try {
        const sendEmail = await resend.emails.send({
            from: fromEmail as string,
            to: [body.email],
            subject: subject,
            react: EmailTemplate(),
            headers: {
                "List-Unsubscribe": unsubscribeUrl,
                "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
            },
        });

        console.log('send', sendEmail);


        const addContact = await resend.contacts.create({
            email: body.email,
            unsubscribed: false,
            audienceId: audienceId as string,
        });

        return NextResponse.json({
            sendEmail,
            addContact,
        });
    } catch (error) {
        return NextResponse.json({ error });
    }
}