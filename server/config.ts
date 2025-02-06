import { z } from 'zod';

// Configuration schema with validation
const configSchema = z.object({
  twilio: z.object({
    accountSid: z.string().startsWith('AC', 'Account SID must start with AC'),
    authToken: z.string(),
    phoneNumber: z.string().startsWith('+', 'Phone number must start with +'),
    whatsappNumber: z.string().optional(), // Optional WhatsApp number from Twilio sandbox
  }),
  app: z.object({
    baseUrl: z.string().url(),
    timeZone: z.string().default('Asia/Jerusalem'),
  }),
});

// Type inference from schema
type Config = z.infer<typeof configSchema>;

// Load and validate configuration
function loadConfig(): Config {
  const config = {
    twilio: {
      accountSid: process.env.TWILIO_ACCOUNT_SID,
      authToken: process.env.TWILIO_AUTH_TOKEN,
      phoneNumber: process.env.TWILIO_PHONE_NUMBER,
      whatsappNumber: process.env.TWILIO_WHATSAPP_NUMBER, // New environment variable
    },
    app: {
      baseUrl: `https://${process.env.REPL_SLUG}.${process.env.REPL_OWNER}.repl.co`,
      timeZone: 'Asia/Jerusalem',
    },
  };

  // Validate configuration
  const result = configSchema.safeParse(config);

  if (!result.success) {
    console.error('Invalid configuration:', result.error.format());
    throw new Error('Invalid configuration');
  }

  return result.data;
}

export const config = loadConfig();