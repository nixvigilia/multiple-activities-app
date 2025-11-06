"use server";

import {prisma} from "@/lib/prisma";

export type Pokemon = {
  id: string;
  pokemon_id: number;
  name: string;
  image_url: string;
  types: string[];
  created_at: Date;
  updated_at: Date;
  _count?: {
    reviews: number;
  };
};

// Search Pokemon using PokeAPI
export async function searchPokemon(name: string) {
  if (!name || name.trim().length === 0) {
    return {data: null, error: "Pokemon name is required"};
  }

  try {
    const searchName = name.toLowerCase().trim();

    // First check if Pokemon exists in database
    const existingPokemon = await prisma.pokemon.findUnique({
      where: {name: searchName},
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (existingPokemon) {
      return {data: existingPokemon, error: null};
    }

    // Fetch from PokeAPI
    const response = await fetch(
      `https://pokeapi.co/api/v2/pokemon/${encodeURIComponent(searchName)}`,
      {
        next: {revalidate: 3600}, // Cache for 1 hour
      }
    );

    if (!response.ok) {
      if (response.status === 404) {
        return {data: null, error: `Pokemon "${name}" not found`};
      }
      return {data: null, error: "Failed to fetch Pokemon data"};
    }

    const data = await response.json();

    // Extract Pokemon data
    const pokemonId = data.id;
    const pokemonName = data.name.toLowerCase();
    const imageUrl =
      data.sprites.other?.["official-artwork"]?.front_default ||
      data.sprites.front_default ||
      "";
    const types = data.types.map((type: any) => type.type.name);

    // Save to database for caching
    const pokemon = await prisma.pokemon.create({
      data: {
        pokemon_id: pokemonId,
        name: pokemonName,
        image_url: imageUrl,
        types: types,
      },
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    return {data: pokemon, error: null};
  } catch (error) {
    console.error("Error searching Pokemon:", error);
    return {data: null, error: "Failed to search Pokemon"};
  }
}

// Get Pokemon by ID
export async function getPokemon(id: string) {
  try {
    const pokemon = await prisma.pokemon.findUnique({
      where: {id},
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    if (!pokemon) {
      return {data: null, error: "Pokemon not found"};
    }

    return {data: pokemon, error: null};
  } catch (error) {
    console.error("Error fetching Pokemon:", error);
    return {data: null, error: "Failed to fetch Pokemon"};
  }
}

// Get all Pokemon with reviews, sorted
export async function getPokemonWithReviews(
  sortBy: "name" | "created_at" = "created_at",
  sortOrder: "asc" | "desc" = "desc"
) {
  try {
    const pokemon = await prisma.pokemon.findMany({
      orderBy: {
        [sortBy]: sortOrder,
      },
      include: {
        _count: {
          select: {
            reviews: true,
          },
        },
      },
    });

    return {data: pokemon, error: null};
  } catch (error) {
    console.error("Error fetching Pokemon:", error);
    return {data: [], error: "Failed to fetch Pokemon"};
  }
}
