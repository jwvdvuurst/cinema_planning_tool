import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function setUserPassword() {
  try {
    // Get email and password from command line arguments
    const args = process.argv.slice(2);
    
    if (args.length < 2) {
      console.log('Usage: npx tsx scripts/set-user-password.ts <email> <password>');
      console.log('');
      console.log('Examples:');
      console.log('  npx tsx scripts/set-user-password.ts admin@filmtheater.nl mypassword123');
      console.log('  npx tsx scripts/set-user-password.ts alice@example.org alice123');
      console.log('');
      process.exit(1);
    }
    
    const email = args[0];
    const password = args[1];
    
    console.log('Setting password for:', email);
    console.log('');
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email },
    });
    
    if (!user) {
      console.error('❌ User not found:', email);
      console.log('');
      console.log('Available users:');
      const users = await prisma.user.findMany({
        select: { email: true, name: true },
      });
      users.forEach(u => console.log(`  - ${u.email} (${u.name})`));
      process.exit(1);
    }
    
    console.log('✓ User found:', user.name);
    
    // Hash the password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    
    // Update the user's password
    await prisma.user.update({
      where: { email },
      data: {
        password: hashedPassword,
        passwordResetToken: null,
        passwordResetExpires: null,
      },
    });
    
    console.log('✓ Password updated successfully!');
    console.log('');
    console.log('═══════════════════════════════════════');
    console.log('Login credentials:');
    console.log('Email:', email);
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

setUserPassword();


