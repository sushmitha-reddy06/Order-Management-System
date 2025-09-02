const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding initial data...');

    const units = await prisma.Unit.createMany({
        data: [
            { code: 'kg', name: 'Kilogram', factorToBase: 1.0, isBaseUnit: true },
            { code: 'g', name: 'Gram', factorToBase: 0.001, isBaseUnit: false },
            { code: 'mg', name: 'Milligram', factorToBase: 0.000001, isBaseUnit: false },

            { code: 'l', name: 'Liter', factorToBase: 1.0, isBaseUnit: true },
            { code: 'ml', name: 'Milliliter', factorToBase: 0.001, isBaseUnit: false },

            { code: 'pcs', name: 'Pieces', factorToBase: 1.0, isBaseUnit: true },
            { code: 'dozen', name: 'Dozen', factorToBase: 12.0, isBaseUnit: false },

            { code: 'm', name: 'Meter', factorToBase: 1.0, isBaseUnit: true },
            { code: 'cm', name: 'Centimeter', factorToBase: 0.01, isBaseUnit: false },
        ],
        skipDuplicates: true,
    });

    console.log(`Seeded ${units.count} units`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });