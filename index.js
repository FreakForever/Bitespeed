const express = require("express");
const bodyParser = require("body-parser");
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
const app = express();
app.use(bodyParser.json());

app.post("/identify", async (req, res) => {
  const { email, phoneNumber } = req.body;

  if (!email && !phoneNumber) {
    return res
      .status(400)
      .json({ error: "Email or phone number is required!" });
  }

  try {
    // Fetch contacts matching email or phone number
    const contacts = await prisma.contact.findMany({
      where: {
        OR: [{ email }, { phoneNumber }],
      },
    });

    if (contacts.length === 0) {
      const newContact = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "primary",
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });
      return res.status(201).json({
        contact: {
          primaryContactId: newContact.id,
          emails: [newContact.email].filter(Boolean),
          phoneNumbers: [newContact.phoneNumber].filter(Boolean),
          secondaryContactIds: [],
        },
      });
    } else {
      // Case 2: Existing contacts found
      contacts.sort((a, b) => a.id - b.id); 
      const primaryContact = contacts[0];
      const updatedContacts = [];

      for (const contact of contacts) {
        if (contact.id !== primaryContact.id) {
          if (
            contact.linkPrecedence !== "secondary" ||
            contact.linkedId !== primaryContact.id
          ) {
            await prisma.contact.update({
              where: { id: contact.id },
              data: {
                linkPrecedence: "secondary",
                linkedId: primaryContact.id,
                updatedAt: new Date(),
              },
            });
            updatedContacts.push(contact.id);
          }
        }
      }
      const emailSet = new Set(contacts.map((c) => c.email).filter(Boolean));
      const phoneNumberSet = new Set(
        contacts.map((c) => c.phoneNumber).filter(Boolean)
      );

      if (emailSet.has(email) && phoneNumberSet.has(phoneNumber)) {
        return res.status(200).json({
          contact: {
            primaryContactId: primaryContact.id,
            emails: Array.from(emailSet),
            phoneNumbers: Array.from(phoneNumberSet),
            secondaryContactIds: updatedContacts,
          },
        });
      }

      const newSecondary = await prisma.contact.create({
        data: {
          email,
          phoneNumber,
          linkPrecedence: "secondary",
          linkedId: primaryContact.id,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      if (email) emailSet.add(email);
      if (phoneNumber) phoneNumberSet.add(phoneNumber);

      return res.status(201).json({
        contact: {
          primaryContactId: primaryContact.id,
          emails: Array.from(emailSet),
          phoneNumbers: Array.from(phoneNumberSet),
          secondaryContactIds: [...updatedContacts, newSecondary.id],
        },
      });
    }
  } catch (error) {
    console.error("Error in /identify route:", error);
    return res.status(500).json({ error: "Internal server error!" });
  }
});

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});









