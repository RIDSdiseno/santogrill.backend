import argon2 from 'argon2';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PRODUCTOS = [
  { slug: 'pizza-margarita', nombre: 'Pizza Margarita (Queso)', categoria: 'pizzas', precio: 7390, descripcion: 'Queso, salsa pomodoro y albahaca. La clásica de siempre.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-pepperoni', nombre: 'Pizza Pepperoni', categoria: 'pizzas', precio: 8390, descripcion: 'Pepperoni y mozzarella sobre masa madre.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-salamin', nombre: 'Pizza Salamín', categoria: 'pizzas', precio: 8390, descripcion: 'Tomate, salamín y albahaca.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-vegie', nombre: 'Pizza Vegie', categoria: 'pizzas', precio: 8390, descripcion: 'Tomate, pimentón, cebolla grill y albahaca.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-tomaso', nombre: 'Pizza Tomaso', categoria: 'pizzas', precio: 9490, descripcion: 'Tomate asado, ajo tostado, cebolla grill y albahaca.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-pepetos', nombre: 'Pizza Pepetos', categoria: 'pizzas', precio: 9490, descripcion: 'Pepperoni, tomate, pimentón y albahaca.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-del-cheff', nombre: 'Pizza del Cheff', categoria: 'pizzas', precio: 9490, descripcion: 'La creación de la semana. Consúltanos cuál es.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-griega', nombre: 'Pizza Griega', categoria: 'pizzas', precio: 12590, descripcion: 'Tomate cherry, queso de cabra del Elqui, salamín y albahaca.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'pizza-pastenina', nombre: 'Pizza Pastenina', categoria: 'pizzas', precio: 13690, descripcion: 'Copa Capitán Pastene, tomate asado y albahaca.', imagen: '/images/ec-cat1-pizza.jpg' },
  { slug: 'costillas-bbq-400', nombre: 'Costillas Ahumadas BBQ — 400 gr aprox.', categoria: 'costillas', precio: 8390, descripcion: 'Ahumadas a baja temperatura, salsa BBQ de la casa.', imagen: '/images/ev-g1-costillar.jpg' },
  { slug: 'costillas-bbq-800', nombre: 'Costillas Ahumadas BBQ — 800 gr aprox.', categoria: 'costillas', precio: 13690, descripcion: 'Ahumadas a baja temperatura, salsa BBQ de la casa.', imagen: '/images/ev-g1-costillar.jpg' },
  { slug: 'costillas-tradicional-400', nombre: 'Costillas Ahumadas Tradicional — 400 gr aprox.', categoria: 'costillas', precio: 8390, imagen: '/images/ev-g1-costillar.jpg' },
  { slug: 'costillas-tradicional-800', nombre: 'Costillas Ahumadas Tradicional — 800 gr aprox.', categoria: 'costillas', precio: 13690, imagen: '/images/ev-g1-costillar.jpg' },
  { slug: 'costillas-hot-400', nombre: 'Costillas Ahumadas Hot BBQ — 400 gr aprox.', categoria: 'costillas', precio: 8390, imagen: '/images/ev-g1-costillar.jpg' },
  { slug: 'costillas-hot-800', nombre: 'Costillas Ahumadas Hot BBQ — 800 gr aprox.', categoria: 'costillas', precio: 13690, imagen: '/images/ev-g1-costillar.jpg' },
  { slug: 'alitas-porcion', nombre: 'Alitas de Pollo — Porción 8 un.', categoria: 'alitas', precio: 5290, descripcion: 'Porción de 8 unidades, listas para calentar y servir.', imagen: '/images/ec-cat3-alitas.jpg' },
  { slug: 'alitas-bbq', nombre: 'Alitas de Pollo BBQ', categoria: 'alitas', precio: 9490, descripcion: 'Ya cocinadas: solo calentar y servir.', imagen: '/images/ec-cat3-alitas.jpg' },
  { slug: 'carne-mechada', nombre: 'Carne Mechada — 1 kilo', categoria: 'carnes', precio: 13690, descripcion: 'Un kilo de carne mechada a fuego lento, lista para servir.', imagen: '/images/ec-p13-carne-mechada.png' },
  { slug: 'carbon-quebracho', nombre: 'Carbón de Quebracho Argentino', categoria: 'complementos', precio: 28390, descripcion: 'Brasa larga y pareja, poco humo. El favorito de los parrilleros.', imagen: '/images/ec-p14-carbon.png' },
  { slug: 'pack-para-2', nombre: 'Pack Santo Grill para 2', categoria: 'packs', precio: 26290, descripcion: '1 Pizza a elección + 1 Costillar (medio) + 1 Porción de alitas.', imagen: '/images/ec-cat4-pack.jpg' },
  { slug: 'pack-parrillero', nombre: 'Pack Parrillero', categoria: 'packs', precio: 36790, descripcion: '2 Costillares (medios) + 2 Porciones de alitas + Papas rústicas.', imagen: '/images/ec-pk2-parrillero.jpg' },
  { slug: 'pack-full', nombre: 'Pack Full Santo Grill', categoria: 'packs', precio: 57790, descripcion: '2 Pizzas + 2 Costillares (medios) + 2 Porciones de alitas + Papas rústicas.', imagen: '/images/ec-pk3-full.jpg' }
];

const BANNERS = [
  { id: 'banner_seed_0001', orden: 1, src: 'https://res.cloudinary.com/dvqpmttci/image/upload/f_auto,q_auto,c_crop,w_1456,h_620,g_north/v1791896411/sto2_xpwa3n.png', alt: 'Fuego, sabor y experiencia en tu evento' },
  { id: 'banner_seed_0002', orden: 2, src: 'https://res.cloudinary.com/dvqpmttci/image/upload/f_auto,q_auto,c_crop,w_1456,h_620,g_north/v1791896411/sto3_fc4tnu.png', alt: 'Pizzas artesanales' },
  { id: 'banner_seed_0003', orden: 3, src: 'https://res.cloudinary.com/dvqpmttci/image/upload/f_auto,q_auto,c_crop,w_1456,h_620,g_north/v1791896418/sto4_ttsqvq.png', alt: 'Carnes y costillas al fuego' },
  { id: 'banner_seed_0004', orden: 4, src: 'https://res.cloudinary.com/dvqpmttci/image/upload/f_auto,q_auto,c_crop,w_1456,h_620,g_north/v1791896418/sto5_rmqqrd.png', alt: 'Catering para eventos' }
];

const GALERIA = [
  { id: 'galeria_seed_001', src: '/images/ev-g1-costillar.jpg',      alt: 'Costillar BBQ',       orden: 1,  grande: true },
  { id: 'galeria_seed_002', src: '/images/ev-g2-carne-fuego.jpg',    alt: 'Carne al fuego',      orden: 2,  grande: true },
  { id: 'galeria_seed_003', src: '/images/ev-g3-parrilla.jpg',       alt: 'Parrilla completa',   orden: 3,  grande: true },
  { id: 'galeria_seed_004', src: '/images/ev-g4-tabla-carnes.jpg',   alt: 'Tabla de carnes',     orden: 4,  grande: false },
  { id: 'galeria_seed_005', src: '/images/ev-g5-tabla-compartir.jpg',alt: 'Tabla para compartir',orden: 5,  grande: false },
  { id: 'galeria_seed_006', src: '/images/ev-g7-brasas.jpg',         alt: 'Fuego y brasas',      orden: 6,  grande: false },
  { id: 'galeria_seed_007', src: '/images/ev-g8-choripanes.jpg',     alt: 'Choripanes y pollo',  orden: 7,  grande: false },
  { id: 'galeria_seed_008', src: '/images/ev-g9-cortes.jpg',         alt: 'Cortes y longanizas', orden: 8,  grande: false },
  { id: 'galeria_seed_009', src: '/images/ev-g11-carro.jpg',         alt: 'Nuestro carro',       orden: 9,  grande: false },
  { id: 'galeria_seed_010', src: '/images/ev-g12-parrilla-humo.jpg', alt: 'Parrilla al humo',    orden: 10, grande: false },
  { id: 'galeria_seed_011', src: '/images/ev-g13-asador.jpg',        alt: 'Asado al asador',     orden: 11, grande: false },
  { id: 'galeria_seed_012', src: '/images/ev-g14-jardin.jpg',        alt: 'Montaje en jardín',   orden: 12, grande: false }
];

async function main() {
  for (const p of PRODUCTOS) {
    await prisma.producto.upsert({ where: { slug: p.slug }, update: p, create: p });
  }

  const cuentas = [
    { email: 'admin@santogrill.cl', nombre: 'Administrador', rol: 'ADMIN' as const, clave: process.env.SEED_ADMIN_PASS ?? 'Qb7-Brasa#Aguila' },
    { email: 'ventas@santogrill.cl', nombre: 'Equipo de ventas', rol: 'VENTAS' as const, clave: process.env.SEED_VENTAS_PASS ?? 'Vt4-Carbon#Norte' }
  ];

  for (const c of cuentas) {
    const passwordHash = await argon2.hash(c.clave, { type: argon2.argon2id });
    await prisma.usuario.upsert({
      where: { email: c.email },
      update: { nombre: c.nombre, rol: c.rol },
      create: { email: c.email, nombre: c.nombre, rol: c.rol, passwordHash }
    });
  }

  for (const b of BANNERS) {
    await prisma.banner.upsert({ where: { id: b.id }, update: b, create: b });
  }

  for (const f of GALERIA) {
    await prisma.galeriaFoto.upsert({ where: { id: f.id }, update: f, create: f });
  }

  console.log(
    'Seed listo: ' + PRODUCTOS.length + ' productos, ' +
    cuentas.length + ' usuarios, ' +
    BANNERS.length + ' banners, ' +
    GALERIA.length + ' fotos de galería.'
  );
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
