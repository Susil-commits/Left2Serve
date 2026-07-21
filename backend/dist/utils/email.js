import nodemailer from 'nodemailer';
import sgMail from '@sendgrid/mail';
const defaultFrom = process.env.SMTP_FROM || process.env.SMTP_USER || '"Left2Serve" <no-reply@left2serve.com>';
if (process.env.SENDGRID_API_KEY) {
    sgMail.setApiKey(process.env.SENDGRID_API_KEY);
}
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: {
        user: process.env.SMTP_USER || '',
        pass: process.env.SMTP_PASS || '',
    },
});
export async function sendEmail(to, subject, html, text) {
    try {
        if (process.env.SENDGRID_API_KEY) {
            await sgMail.send({
                to,
                from: defaultFrom,
                subject,
                text: text || html.replace(/<[^>]+>/g, ''),
                html,
            });
            return;
        }
        if (!process.env.SMTP_USER) {
            console.warn('Neither SENDGRID_API_KEY nor SMTP_USER configured. Skipping email to:', to);
            return;
        }
        await transporter.sendMail({
            from: defaultFrom,
            to,
            subject,
            text: text || html.replace(/<[^>]+>/g, ''),
            html,
        });
    }
    catch (err) {
        console.error('Failed to send email to', to, err);
    }
}
export async function sendWelcomeEmail(to, name) {
    const subject = 'Welcome to Left2Serve!';
    const html = `
    <h1>Welcome, ${name}!</h1>
    <p>Thank you for joining Left2Serve. We are excited to have you on board.</p>
    <p>Together, we can make a difference by reducing food waste and helping those in need.</p>
    <br/>
    <p>Best regards,<br/>The Left2Serve Team</p>
  `;
    await sendEmail(to, subject, html);
}
export async function sendReservationApprovedEmail(to, userName, listingTitle, pickupAddress) {
    const subject = 'Reservation Approved - Left2Serve';
    const html = `
    <h2>Your Reservation is Approved!</h2>
    <p>Hi ${userName},</p>
    <p>Your reservation for <strong>"${listingTitle}"</strong> has been approved by the donor.</p>
    <p><strong>Pickup Address:</strong> ${pickupAddress}</p>
    <p>Please make sure to arrive on time and contact the donor if you have any issues.</p>
    <br/>
    <p>Thank you,<br/>The Left2Serve Team</p>
  `;
    await sendEmail(to, subject, html);
}
export async function sendPasswordResetEmail(to, userName, resetLink) {
    const subject = 'Password Reset Request - Left2Serve';
    const html = `
    <h2>Password Reset</h2>
    <p>Hi ${userName},</p>
    <p>We received a request to reset your password. Click the link below to set a new password:</p>
    <p><a href="${resetLink}" style="display:inline-block;padding:10px 20px;background-color:#EF4444;color:white;text-decoration:none;border-radius:5px;">Reset Password</a></p>
    <p>If you didn't request this, you can safely ignore this email.</p>
    <p>This link will expire in 1 hour.</p>
    <br/>
    <p>Thank you,<br/>The Left2Serve Team</p>
  `;
    await sendEmail(to, subject, html);
}
export async function sendOrderUpdateEmail(to, userName, listingTitle, status) {
    const subject = `Order Update: ${status.toUpperCase()} - Left2Serve`;
    const html = `
    <h2>Order Status Update</h2>
    <p>Hi ${userName},</p>
    <p>The status of the reservation for <strong>"${listingTitle}"</strong> has been updated to: <strong>${status.toUpperCase()}</strong>.</p>
    <p>Log in to your dashboard to view more details.</p>
    <br/>
    <p>Thank you,<br/>The Left2Serve Team</p>
  `;
    await sendEmail(to, subject, html);
}
export async function sendOrderCancelledEmail(to, userName, listingTitle) {
    const subject = 'Reservation Cancelled - Left2Serve';
    const html = `
    <h2>Reservation Cancelled</h2>
    <p>Hi ${userName},</p>
    <p>Unfortunately, the reservation for <strong>"${listingTitle}"</strong> has been cancelled.</p>
    <p>If you are a donor, this listing will become available again. If you are a receiver, please check the platform for other available listings.</p>
    <br/>
    <p>Thank you,<br/>The Left2Serve Team</p>
  `;
    await sendEmail(to, subject, html);
}
