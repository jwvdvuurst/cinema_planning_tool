import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create demo users
  const users = await prisma.user.createMany({
    data: [
      { name: 'Alice (Tech)', email: 'alice@example.org', roles: ['TECHNIEK'] },
      { name: 'Bob (Zaal)', email: 'bob@example.org', roles: ['ZAALWACHT'] },
      { name: 'Carol (Both)', email: 'carol@example.org', roles: ['TECHNIEK', 'ZAALWACHT'] },
      { name: 'Daan (Admin)', email: 'daan@example.org', roles: ['PROGRAMMA', 'ADMIN'] },
      { name: 'Eve (Tech)', email: 'eve@example.org', roles: ['TECHNIEK'] },
      { name: 'Frank (Zaal)', email: 'frank@example.org', roles: ['ZAALWACHT'] },
      { name: 'Grace (Both)', email: 'grace@example.org', roles: ['TECHNIEK', 'ZAALWACHT'] },
      { name: 'Henry (Prog)', email: 'henry@example.org', roles: ['PROGRAMMA'] },
    ],
    skipDuplicates: true,
  });

  // Create demo films
  const films = await Promise.all([
    prisma.film.upsert({
      where: { title: 'Cinema Paradiso' },
      update: {},
      create: { title: 'Cinema Paradiso', notes: 'Classic Italian film' },
    }),
    prisma.film.upsert({
      where: { title: 'The Godfather' },
      update: {},
      create: { title: 'The Godfather', notes: 'Crime drama masterpiece' },
    }),
    prisma.film.upsert({
      where: { title: 'Pulp Fiction' },
      update: {},
      create: { title: 'Pulp Fiction', notes: 'Quentin Tarantino classic' },
    }),
    prisma.film.upsert({
      where: { title: 'Inception' },
      update: {},
      create: { title: 'Inception', notes: 'Mind-bending sci-fi thriller' },
    }),
    prisma.film.upsert({
      where: { title: 'Blade Runner 2049' },
      update: {},
      create: { title: 'Blade Runner 2049', notes: 'Sci-fi sequel' },
    }),
    prisma.film.upsert({
      where: { title: 'Parasite' },
      update: {},
      create: { title: 'Parasite', notes: 'South Korean thriller' },
    }),
    prisma.film.upsert({
      where: { title: 'Ghostlight' },
      update: {},
      create: { title: 'Ghostlight', notes: 'Drama film' },
    }),
  ]);

  // Create demo screenings
  const now = new Date();
  const screenings = await Promise.all([
    prisma.screening.create({
      data: {
        filmId: films[0].id,
        startsAt: new Date(now.getTime() + 86400000), // Tomorrow
        endsAt: new Date(now.getTime() + 86400000 + 9000000), // + 2.5 hours
        location: 'Zaal 1',
        notes: 'Evening screening',
      },
    }),
    prisma.screening.create({
      data: {
        filmId: films[1].id,
        startsAt: new Date(now.getTime() + 2 * 86400000), // Day after tomorrow
        endsAt: new Date(now.getTime() + 2 * 86400000 + 10800000), // + 3 hours
        location: 'Zaal 1',
        notes: 'Weekend matinee',
      },
    }),
    prisma.screening.create({
      data: {
        filmId: films[2].id,
        startsAt: new Date(now.getTime() + 3 * 86400000),
        endsAt: new Date(now.getTime() + 3 * 86400000 + 9000000),
        location: 'Zaal 2',
        notes: 'Late night screening',
      },
    }),
    prisma.screening.create({
      data: {
        filmId: films[3].id,
        startsAt: new Date(now.getTime() + 5 * 86400000),
        endsAt: new Date(now.getTime() + 5 * 86400000 + 10800000),
        location: 'Zaal 1',
        notes: 'IMAX screening',
      },
    }),
    prisma.screening.create({
      data: {
        filmId: films[4].id,
        startsAt: new Date(now.getTime() + 7 * 86400000),
        endsAt: new Date(now.getTime() + 7 * 86400000 + 9900000),
        location: 'Zaal 2',
        notes: '4K screening',
      },
    }),
    prisma.screening.create({
      data: {
        filmId: films[5].id,
        startsAt: new Date(now.getTime() + 10 * 86400000),
        endsAt: new Date(now.getTime() + 10 * 86400000 + 8100000),
        location: 'Zaal 1',
        notes: 'Award-winning film',
      },
    }),
    prisma.screening.create({
      data: {
        filmId: films[6].id, // Ghostlight
        startsAt: new Date('2025-10-10T20:00:00Z'),
        endsAt: new Date('2025-10-10T22:30:00Z'),
        location: 'Zaal 1',
        notes: 'Special screening',
      },
    }),
  ]);

  // Get users for availability creation
  const uAlice = await prisma.user.findUnique({ where: { email: 'alice@example.org' } });
  const uBob = await prisma.user.findUnique({ where: { email: 'bob@example.org' } });
  const uCarol = await prisma.user.findUnique({ where: { email: 'carol@example.org' } });
  const uEve = await prisma.user.findUnique({ where: { email: 'eve@example.org' } });
  const uFrank = await prisma.user.findUnique({ where: { email: 'frank@example.org' } });
  const uGrace = await prisma.user.findUnique({ where: { email: 'grace@example.org' } });

  if (uAlice && uBob && uCarol && uEve && uFrank && uGrace) {
    // Create availability data
    await prisma.availability.createMany({
      data: [
        // Screening 1
        { screeningId: screenings[0].id, userId: uAlice.id, role: 'TECHNIEK', status: 'available' },
        { screeningId: screenings[0].id, userId: uCarol.id, role: 'TECHNIEK', status: 'available' },
        { screeningId: screenings[0].id, userId: uBob.id, role: 'ZAALWACHT', status: 'available' },
        { screeningId: screenings[0].id, userId: uCarol.id, role: 'ZAALWACHT', status: 'available' },
        
        // Screening 2
        { screeningId: screenings[1].id, userId: uEve.id, role: 'TECHNIEK', status: 'available' },
        { screeningId: screenings[1].id, userId: uGrace.id, role: 'TECHNIEK', status: 'available' },
        { screeningId: screenings[1].id, userId: uFrank.id, role: 'ZAALWACHT', status: 'available' },
        { screeningId: screenings[1].id, userId: uGrace.id, role: 'ZAALWACHT', status: 'available' },
        
        // Screening 3
        { screeningId: screenings[2].id, userId: uAlice.id, role: 'TECHNIEK', status: 'available' },
        { screeningId: screenings[2].id, userId: uEve.id, role: 'TECHNIEK', status: 'available' },
        { screeningId: screenings[2].id, userId: uBob.id, role: 'ZAALWACHT', status: 'available' },
        { screeningId: screenings[2].id, userId: uFrank.id, role: 'ZAALWACHT', status: 'available' },
      ],
    });
  }

  // Create constraints
  await prisma.constraint.upsert({
    where: { key: 'max_shifts_per_week' },
    update: { value: '2' },
    create: { key: 'max_shifts_per_week', value: '2' },
  });
  await prisma.constraint.upsert({
    where: { key: 'max_same_film_per_month' },
    update: { value: '2' },
    create: { key: 'max_same_film_per_month', value: '2' },
  });

  // Create some skill tags
  await prisma.skillTag.createMany({
    data: [
      { userId: uAlice!.id, tag: 'Projection Expert' },
      { userId: uAlice!.id, tag: 'Sound Engineer' },
      { userId: uBob!.id, tag: 'Customer Service' },
      { userId: uCarol!.id, tag: 'Technical Lead' },
      { userId: uCarol!.id, tag: 'Usher' },
      { userId: uEve!.id, tag: 'Digital Projection' },
      { userId: uGrace!.id, tag: 'Technical Support' },
      { userId: uGrace!.id, tag: 'Box Office' },
    ],
  });

  // Create demo assignments
  await prisma.assignment.createMany({
    data: [
      // Alice assigned to first screening as TECHNIEK
      { screeningId: screenings[0].id, userId: uAlice!.id, role: 'TECHNIEK', source: 'manual' },
      // Bob assigned to first screening as ZAALWACHT
      { screeningId: screenings[0].id, userId: uBob!.id, role: 'ZAALWACHT', source: 'manual' },
      // Carol assigned to second screening as TECHNIEK
      { screeningId: screenings[1].id, userId: uCarol!.id, role: 'TECHNIEK', source: 'manual' },
      // Eve assigned to second screening as ZAALWACHT
      { screeningId: screenings[1].id, userId: uEve!.id, role: 'ZAALWACHT', source: 'manual' },
      // Alice assigned to third screening as TECHNIEK (so she has multiple assignments)
      { screeningId: screenings[2].id, userId: uAlice!.id, role: 'TECHNIEK', source: 'manual' },
      // Grace assigned to third screening as ZAALWACHT
      { screeningId: screenings[2].id, userId: uGrace!.id, role: 'ZAALWACHT', source: 'manual' },
    ],
  });

  console.log('Seed completed successfully!');
  console.log(`Created ${users.count} users, ${films.length} films, ${screenings.length} screenings`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

