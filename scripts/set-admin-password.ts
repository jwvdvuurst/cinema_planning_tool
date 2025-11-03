import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setAdminPassword() {
  try {
    // Define the admin email and password
    const adminEmail = 'admin@filmtheater.nl';
    const password = 'admin123'; // Change this to whatever you want
    
    console.log('Setting password for:', adminEmail);
    console.log('Password:', password);
    console.log('');
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email: adminEmail },
    });
    
    if (!user) {
      console.error('❌ User not found:', adminEmail);
      console.log('Creating user...');
      
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      await prisma.user.create({
        data: {
          email: adminEmail,
          name: 'Admin User',
          password: hashedPassword,
          roles: ['ADMIN', 'PROGRAMMA', 'TECHNIEK', 'ZAALWACHT'],
          active: true,
        },
      });
      
      console.log('✓ User created successfully!');
    } else {
      console.log('✓ User found:', user.name);
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      const hashedPassword = await bcrypt.hash(password, salt);
      
      // Update the user's password
      await prisma.user.update({
        where: { email: adminEmail },
        data: {
          password: hashedPassword,
          passwordResetToken: null,
          passwordResetExpires: null,
        },
      });
      
      console.log('✓ Password updated successfully!');
    }
    
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('Login credentials:');
    console.log('Email:', adminEmail);
    console.log('Password:', password);
    console.log('═══════════════════════════════════════');
    console.log('');
    console.log('You can now log in at: http://localhost:3000/auth/login');
    
  } catch (error) {
    console.error('Error setting password:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

setAdminPassword();


