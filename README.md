# Identify API

## Description

This API helps manage and identify contacts based on email and phone number. It supports creating new contacts and updating existing ones to maintain unique primary and secondary associations.

## Endpoints

### POST `/identify`

- **Description**: Creates or updates contact information in the database. If a contact with the provided email or phone number exists, it associates it with a primary contact. Otherwise, it creates a new primary contact.

-- ** Body
``` {
  "email": "example@example.com",
  "phoneNumber": "1234567890"
}
{
  "email": "john.doe@example.com",
  "phoneNumber": "9876543210"
}
```

--**Expected Response
```
{
  "contact": {
    "primaryContactId": 1,
    "emails": ["example@example.com", "another@example.com"],
    "phoneNumbers": ["1234567890", "9876543210"],
    "secondaryContactIds": [2, 3]
  }
}

```
