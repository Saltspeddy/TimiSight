// Flower ICONS: the small illustrated artwork shown on garden tiles and in the bouquet.
// (The big PHOTO of the real statue on a flower's page is separate: see FLOWER_IMAGES in
// flowers.ts.)
//
// Icons are bundled with the app, keyed by the flower's id (the same slug as in the
// `flowers` table), because React Native's require() needs a fixed path at build time and
// can't take a URL from the database. A flower with no icon yet shows a drawn bloom in its
// colour, so adding a flower to the database never leaves a blank tile.
//
// TO ADD AN ICON
//   1. Save the PNG as assets/flowers/<flower-id>.png   (see assets/flowers/README.md)
//   2. Add one line below, using the same id.
//   3. Reload the app. (Metro bundles the new image, no native rebuild needed.)
export const FLOWER_ICONS: Record<string, number> = {
  'violinist-rose': require('../../assets/flowers/violinist-rose.png'),
  'hop-flower': require('../../assets/flowers/hop-flower.png'),
  // No flower with the id 'tulip' exists yet. When you add one to the `flowers` table with
  // that id, its icon is already wired up.
  tulip: require('../../assets/flowers/tulip.png'),
};
