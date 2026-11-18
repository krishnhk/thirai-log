import React from 'react';
import { Image } from 'react-native';

const EDIT = require('../../assets/icons/edit.png');

interface EditIconProps {
  size?: number;
  color: string;
}

/** The app's edit icon (a solid square with a pencil), tinted to the given colour. Used wherever something can be edited. */
export function EditIcon({ size = 15, color }: EditIconProps) {
  return (
    <Image source={EDIT} style={{ width: size, height: size }} resizeMode="contain" tintColor={color} accessible={false} />
  );
}
