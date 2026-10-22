import type { ImageSourcePropType } from 'react-native';

/** Local images must use Metro's static require so Android and iOS package them. */
export const LOCAL_CIAO_IMAGE_URI = 'lunivo-asset://ciao-greeting';

export function localInfoImageSource(url: string): ImageSourcePropType | null {
  if (url === LOCAL_CIAO_IMAGE_URI) {
    return require('../../../assets/lessons/ciao-greeting.png');
  }
  return null;
}
