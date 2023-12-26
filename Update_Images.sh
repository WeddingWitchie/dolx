#!/bin/bash

echo "Choose an image pack:"
echo "1. Vanilla"
echo "2. BEEESSS"
echo "3. BEEESSS + Hikari Female"
echo "4. BEEESSS + Hikari Male"
echo "5. BEEESSS + Paril + Hairstyle Extended"

read -p "Enter the number of your choice: " choice

destinationFolder="img"

if [ ! -d "$destinationFolder" ]; then
    mkdir "$destinationFolder"
fi

if [ "$choice" == "1" ]; then
    echo "You chose Vanilla."
    cp -r vanillaimg/* "$destinationFolder/"
elif [ "$choice" == "2" ]; then
    echo "You chose BEEESSS."
    cp -r beeesssimg/* "$destinationFolder/"
elif [ "$choice" == "3" ]; then
    echo "You chose BEEESSS + Hikari Female."
    cp -r beeessshikarifemaleimg/* "$destinationFolder/"
elif [ "$choice" == "4" ]; then
    echo "You chose BEEESSS + Hikari Male."
    cp -r beeessshikarimaleimg/* "$destinationFolder/"
elif [ "$choice" == "5" ]; then
    echo "You chose BEEESSS + Paril + Hairstyle Extended."
    cp -r beeesssparilhairstyleextendedimg/* "$destinationFolder/"
else
    echo "Invalid choice. Please enter a number from the list."
    exit 1
fi

echo "Contents of source folders have been successfully copied to $destinationFolder."
exit 0
