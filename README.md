# Identify API

## Description

This API helps manage and identify contacts based on email and phone number. It supports creating new contacts and updating existing ones to maintain unique primary and secondary associations.

## Endpoints

### POST `/identify`

- **Description**: Creates or updates contact information in the database. If a contact with the provided email or phone number exists, it associates it with a primary contact. Otherwise, it creates a new primary contact.

### Body
``` {
  "email": "example@example.com",
  "phoneNumber": "1234567890"
}
{
  "email": "john.doe@example.com",
  "phoneNumber": "9876543210"
}
```

### Expected Response
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

For running in local:
1. Clone the repo ```git clone https://github.com/your-repo/identify-api.git```
2. ```npm install```
3. ```npx prisma migrate dev```
4. ```node index.js```

For testing Use the below deployed link:
https://bitespeed-a6y4.onrender.com/identify
