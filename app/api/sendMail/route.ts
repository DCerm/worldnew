
import { NextRequest, NextResponse } from 'next/server';
import nodemailer from 'nodemailer';

export async function POST(req: NextRequest) {
    try {
        const { to, cc, bcc, message } = await req.json();

        const transporter = nodemailer.createTransport({
            host: process.env.SMTP_SERVER_HOST,
            port: 587,
            secure: false, // Set to true for port 465, otherwise false
            auth: {
                user: process.env.SMTP_SERVER_USERNAME,
                pass: process.env.SMTP_SERVER_PASSWORD,
            },
        });

        const info = await transporter.sendMail({
            from: 'info@farmtrustnetwork.ng',
            to,                                    
            cc,                                    
            bcc,                                   
            subject: message.subject || 'No Subject', 
            text: message.text,        
            html: message.html,                  
        });

        return NextResponse.json({ message: 'Email sent successfully', info }, { status: 200 });
    } catch (error) {
        let emessage
        if (error instanceof Error) {
            emessage = error.message
        }
        console.error('Error sending email:', emessage);
        return NextResponse.json({ message: 'Failed to send email', error: emessage }, { status: 500 });
    }
}