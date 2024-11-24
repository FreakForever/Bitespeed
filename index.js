const express = require('express');
const { PrismaClient } = require('@prisma/client');

const app = express();
const prisma = new PrismaClient();
const port = process.env.PORT || 3000;

app.use(express.json());

app.post('/identify', async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res.status(400).json({ error: 'Credentials should not be empty.' });
  }

  try {
    // Step 1: Find all related contacts 
    const existingContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { email: email || undefined },
          { phoneNumber: phoneNumber || undefined },
        ],
      },
      orderBy: {
        createdAt: 'asc',
      },
    });

    if (existingContacts.length === 0) {
      // Step 2: No related contacts exist, create a new primary contact
      const newContact = await prisma.contact.create({
        data: {
          phoneNumber,
          email,
          linkedId: null,
          linkPrecedence: 'primary',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      });

      return res.status(200).json({
        contact: {
          primaryContactId: newContact.id,
          emails: email ? [email] : [],
          phoneNumbers: phoneNumber ? [phoneNumber] : [],
          secondaryContactIds: [],
        },
      });
    }

    // Step 3: Process existing contacts
    const earliestContact = existingContacts[0];
    const uniqueEmails = new Set(existingContacts.map(c => c.email).filter(Boolean));
    const uniquePhones = new Set(existingContacts.map(c => c.phoneNumber).filter(Boolean));

    // Include new email/phoneNumber
    if (email) uniqueEmails.add(email);
    if (phoneNumber) uniquePhones.add(phoneNumber);

    // Update all other contacts to secondary if they are not the primary contact
    for (let contact of existingContacts) {
      if (contact.id !== earliestContact.id) {
        if (contact.linkPrecedence !== 'secondary' || contact.linkedId !== earliestContact.id) {
          await prisma.contact.update({
            where: { id: contact.id },
            data: {
              linkPrecedence: 'secondary',
              linkedId: earliestContact.id,
              updatedAt: new Date(),
            },
          });
        }
      } else if (contact.linkPrecedence !== 'primary' || contact.linkedId !== null) {
        // Ensure the earliest contact is set as primary
        await prisma.contact.update({
          where: { id: contact.id },
          data: {
            linkPrecedence: 'primary',
            linkedId: null,
            updatedAt: new Date(),
          },
        });
      }
    }

    // If no existing contact matches both email and phoneNumber, create a new secondary contact
    const hasMatchingContact = existingContacts.some(
      c => (c.email === email) || (c.phoneNumber === phoneNumber)
    );

    if (!hasMatchingContact) {
      await prisma.contact.create({
        data: {
          phoneNumber,
          email,
          linkedId: earliestContact.id,
          linkPrecedence: 'secondary',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        },
      });
    }

    // Step 4: Fetch all updated contacts
    const allRelatedContacts = await prisma.contact.findMany({
      where: {
        OR: [
          { id: earliestContact.id },
          { linkedId: earliestContact.id },
        ],
      },
    });

    // Consolidate emails and phone numbers
    const consolidatedEmails = Array.from(
      new Set(allRelatedContacts.map(c => c.email).filter(Boolean))
    );
    const consolidatedPhones = Array.from(
      new Set(allRelatedContacts.map(c => c.phoneNumber).filter(Boolean))
    );
    console.log(`Consolidated Emails:${consolidatedEmails}`)
    console.log(`Consolidated Phones:${consolidatedPhones}`)

    // Extract secondary contact IDs
    const secondaryContactIds = allRelatedContacts
      .filter(c => c.id !== earliestContact.id)
      .map(c => c.id);

    // Step 5: Return the consolidated response
    return res.status(200).json({
      contact: {
        primaryContactId: earliestContact.id,
        emails: consolidatedEmails,
        phoneNumbers: consolidatedPhones,
        secondaryContactIds,
      },
    });
  } catch (error) {
    console.error('Error in /identify:', error);
    return res.status(500).json({ error: 'Something went wrong.' });
  }
});

app.listen(port, async () => {
  try {
    await prisma.$connect();
    console.log(`Server is running on port ${port}`);
  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
});
