import { NextRequest, NextResponse } from 'next/server';

interface Recipient {
  id?: number;
  name: string;
  phone: string;
  district?: string;
  state?: string;
  area?: string;
  business?: string;
  category?: string;
}

interface BroadcastRequest {
  recipients: Recipient[];
  message: string;
  imageUrl?: string;
  credentials?: {
    phoneNumberId?: string;
    accessToken?: string;
  };
}

// Clean and normalize phone number into Meta E.164 without leading '+'
function normalizeWhatsAppNumber(raw: string): string | null {
  if (!raw) return null;
  // Take first phone if comma-separated
  const first = raw.split(',')[0].trim();
  let digits = first.replace(/\D/g, '');

  // Strip leading 0
  if (digits.startsWith('0') && digits.length === 11) {
    digits = digits.slice(1);
  }

  // If 10 digits (standard Indian mobile), prepend 91
  if (digits.length === 10) {
    digits = '91' + digits;
  }

  // Valid international mobile number should be between 10 and 15 digits
  if (digits.length < 10 || digits.length > 15) {
    return null;
  }

  return digits;
}

// Personalize message placeholders
function personalizeMessage(template: string, contact: Recipient): string {
  let text = template;
  text = text.replace(/{name}/gi, contact.name || 'Valued Partner');
  text = text.replace(/{business}/gi, contact.business || '');
  text = text.replace(/{district}/gi, contact.district || '');
  text = text.replace(/{state}/gi, contact.state || '');
  text = text.replace(/{area}/gi, contact.area || '');
  text = text.replace(/{category}/gi, contact.category || '');
  return text;
}

export async function POST(request: NextRequest) {
  try {
    const body: BroadcastRequest = await request.json();
    const { recipients, message, imageUrl, credentials } = body;

    if (!recipients || !Array.isArray(recipients) || recipients.length === 0) {
      return NextResponse.json(
        { success: false, error: 'At least one recipient is required' },
        { status: 400 }
      );
    }

    if (!message && !imageUrl) {
      return NextResponse.json(
        { success: false, error: 'A message or image is required' },
        { status: 400 }
      );
    }

    // Determine Meta Cloud API credentials
    const phoneNumberId =
      credentials?.phoneNumberId?.trim() ||
      process.env.WHATSAPP_PHONE_NUMBER_ID?.trim();
    const accessToken =
      credentials?.accessToken?.trim() ||
      process.env.WHATSAPP_ACCESS_TOKEN?.trim();

    if (!phoneNumberId || !accessToken) {
      return NextResponse.json(
        {
          success: false,
          error:
            'Meta WhatsApp Cloud API credentials missing. Please configure your Phone Number ID and Access Token in Settings or environment variables.',
          hint: 'You can test sending via the interactive Web Queue mode, or obtain free Meta Cloud API credentials from developers.facebook.com.',
        },
        { status: 401 }
      );
    }

    const endpoint = `https://graph.facebook.com/v21.0/${phoneNumberId}/messages`;

    const results: Array<{
      contactId?: number;
      name: string;
      phone: string;
      status: 'sent' | 'failed' | 'invalid_number';
      messageId?: string;
      error?: string;
    }> = [];

    let sentCount = 0;
    let failedCount = 0;

    for (const contact of recipients) {
      const normalizedPhone = normalizeWhatsAppNumber(contact.phone);

      if (!normalizedPhone) {
        results.push({
          contactId: contact.id,
          name: contact.name,
          phone: contact.phone || 'N/A',
          status: 'invalid_number',
          error: 'Missing or invalid phone number digits',
        });
        failedCount++;
        continue;
      }

      const personalizedText = personalizeMessage(message || '', contact);

      // Construct Meta Cloud API Payload
      let payload: Record<string, any>;

      if (imageUrl && imageUrl.trim()) {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'image',
          image: {
            link: imageUrl.trim(),
            caption: personalizedText,
          },
        };
      } else {
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: normalizedPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: personalizedText,
          },
        };
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(payload),
        });

        const resData = await res.json();

        if (res.ok && resData.messages && resData.messages[0]) {
          sentCount++;
          results.push({
            contactId: contact.id,
            name: contact.name,
            phone: normalizedPhone,
            status: 'sent',
            messageId: resData.messages[0].id,
          });
        } else {
          failedCount++;
          const errMsg =
            resData.error?.message ||
            resData.error?.error_user_msg ||
            JSON.stringify(resData.error || 'Failed sending via Meta API');
          results.push({
            contactId: contact.id,
            name: contact.name,
            phone: normalizedPhone,
            status: 'failed',
            error: errMsg,
          });
        }
      } catch (err: any) {
        failedCount++;
        results.push({
          contactId: contact.id,
          name: contact.name,
          phone: normalizedPhone,
          status: 'failed',
          error: err.message || 'Network error calling Meta API',
        });
      }

      // Gentle rate throttle (100ms per message to respect API rate limits)
      if (recipients.length > 1) {
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    return NextResponse.json({
      success: true,
      total: recipients.length,
      sentCount,
      failedCount,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Internal broadcast error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  // Test connection to Meta Cloud API
  const { searchParams } = new URL(request.url);
  const phoneNumberId =
    searchParams.get('phoneNumberId') || process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken =
    searchParams.get('accessToken') || process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    return NextResponse.json({
      configured: false,
      message: 'Meta WhatsApp Cloud API credentials not configured',
    });
  }

  try {
    const res = await fetch(
      `https://graph.facebook.com/v21.0/${phoneNumberId}?fields=verified_name,code_verification_status,display_phone_number,quality_rating`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );

    const data = await res.json();

    if (res.ok && data.display_phone_number) {
      return NextResponse.json({
        configured: true,
        valid: true,
        displayPhoneNumber: data.display_phone_number,
        verifiedName: data.verified_name,
        qualityRating: data.quality_rating,
      });
    } else {
      return NextResponse.json({
        configured: true,
        valid: false,
        error: data.error?.message || 'Invalid credentials or phone number ID',
      });
    }
  } catch (err: any) {
    return NextResponse.json({
      configured: true,
      valid: false,
      error: err.message,
    });
  }
}
