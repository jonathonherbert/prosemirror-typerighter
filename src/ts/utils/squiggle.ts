const squiggleMap = {
  VERTICAL: (colour: string) =>
    `<svg width="4" height="20" fill="none" transform="scale(-1,1)" xmlns="http://www.w3.org/2000/svg"><path stroke="${colour}" stroke-width="2" d="m2.08695,-2.80434c1.33333,1.72222 1.33333,3.44444 0,5.16667c-1.33333,1.72222 -1.33333,3.44444 0,5.16663c1.33333,1.7223 1.33333,3.4445 0,5.1667c-1.33333,1.7222 -1.33333,3.4444 0,5.1667c1.33333,1.7222 1.33333,3.4444 0,5.1666c-1.33333,1.7223 -1.33333,3.4445 0,5.1667"/></svg>`,
  HORIZONTAL: (colour: string) =>
    `<svg width="16" height="4" fill="none" xmlns="http://www.w3.org/2000/svg"><path stroke="${colour}" stroke-width="2" d="m22.65517,2c-1.37161,1.33333 -2.74333,1.33333 -4.11494,0c-1.37161,-1.33333 -2.74333,-1.33333 -4.11494,0c-1.37161,1.33333 -2.74333,1.33333 -4.11494,0c-1.37161,-1.33333 -2.74333,-1.33333 -4.11494,0c-1.37164,1.33333 -2.7433,1.33333 -4.11494,0c-1.37164,-1.33333 -2.7433,-1.33333 -4.11494,0"/></svg>`
};

export const getSquiggleAsUri = (
  colour: string,
  orientation: "HORIZONTAL" | "VERTICAL" = "HORIZONTAL"
) => {
  const svg = squiggleMap[orientation](colour);
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
};
