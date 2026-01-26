/**
 * Email templates for vendor outreach
 */

export const templates = {
  initialPitch: {
    subject: 'Your listing on KetamineSoftware.com',
    body: `Hi {{contactName}},

I run KetamineSoftware.com, an independent directory helping ketamine clinics find the right software for their practice.

{{vendorName}} is already listed in our directory, but I'd like to offer you a free enhanced listing that includes:

- Your logo prominently displayed
- Expanded description and feature highlights
- Priority placement in the {{category}} category
- Direct link to your demo/pricing page

In exchange, would you consider:
- Adding a backlink to us from your resources or partners page, OR
- Mentioning us in your newsletter or blog

This is a simple exchange - no cost, no ongoing commitment. Just mutual visibility in an underserved niche.

Let me know if you're interested and I'll set up the enhanced listing right away.

Best,
{{senderName}}
KetamineSoftware.com`
  },

  followUp: {
    subject: 'Re: Your listing on KetamineSoftware.com',
    body: `Hi {{contactName}},

Just following up on my previous email about {{vendorName}}'s listing on KetamineSoftware.com.

The offer still stands - enhanced listing in exchange for a simple backlink. No cost, no commitment.

Would this be something you'd be open to?

Best,
{{senderName}}`
  },

  thankYou: {
    subject: 'Thanks for the partnership!',
    body: `Hi {{contactName}},

Thanks for adding the backlink to KetamineSoftware.com!

I've upgraded {{vendorName}}'s listing with:
- Your logo
- Expanded description
- Priority placement

You can see it live at: https://ketaminesoftware.com/software/{{vendorSlug}}

Let me know if you'd like any changes to the listing.

Best,
{{senderName}}`
  }
};

export function renderTemplate(templateName, variables) {
  const template = templates[templateName];
  if (!template) {
    throw new Error(`Unknown template: ${templateName}`);
  }

  let subject = template.subject;
  let body = template.body;

  for (const [key, value] of Object.entries(variables)) {
    const placeholder = `{{${key}}}`;
    subject = subject.replace(new RegExp(placeholder, 'g'), value || '');
    body = body.replace(new RegExp(placeholder, 'g'), value || '');
  }

  return { subject, body };
}
