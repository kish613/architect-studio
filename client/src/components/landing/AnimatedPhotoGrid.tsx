const gridImages = {
  row1: [
    "/landing-images/floorplan-1.jpg",
    "/landing-images/floorplan-2.jpg",
    "/landing-images/floorplan-3.jpg",
    "/landing-images/floorplan-4.jpg",
    "/landing-images/floorplan-5.jpg",
    "/landing-images/floorplan-6.jpg",
  ],
  row2: [
    "/landing-images/floorplan-7.jpg",
    "/landing-images/floorplan-8.jpg",
    "/landing-images/floorplan-9.jpg",
    "/landing-images/floorplan-10.jpg",
    "/landing-images/floorplan-11.jpg",
    "/landing-images/floorplan-12.jpg",
  ],
  row3: [
    "/landing-images/floorplan-13.jpg",
    "/landing-images/floorplan-14.jpg",
    "/landing-images/floorplan-15.jpg",
    "/landing-images/floorplan-16.jpg",
    "/landing-images/floorplan-17.jpg",
    "/landing-images/floorplan-18.jpg",
  ],
};

function GridItem({ imageUrl }: { imageUrl: string }) {
  return (
    <div className="grid-item relative w-full h-full overflow-hidden rounded-lg bg-white shadow-sm border border-slate-200">
      <div
        className="w-full h-full bg-cover bg-center"
        style={{ backgroundImage: `url('${imageUrl}')` }}
      />
    </div>
  );
}

export function AnimatedPhotoGrid() {
  return (
    <div className="perspective-frame w-full h-[650px] flex items-center justify-center bg-slate-50">
      <div className="perspective-inner w-full h-full opacity-80">
        <div className="grid-container h-full grid grid-rows-3 gap-4 p-4">
          {/* Row 1 - floatRight animation */}
          <div className="grid gap-4 grid-cols-6 row-animate-right">
            {gridImages.row1.map((url, index) => (
              <GridItem key={`row1-${index}`} imageUrl={url} />
            ))}
          </div>

          {/* Row 2 - floatLeft animation */}
          <div className="grid gap-4 grid-cols-6 row-animate-left">
            {gridImages.row2.map((url, index) => (
              <GridItem key={`row2-${index}`} imageUrl={url} />
            ))}
          </div>

          {/* Row 3 - floatRight animation */}
          <div className="grid gap-4 grid-cols-6 row-animate-right-slow">
            {gridImages.row3.map((url, index) => (
              <GridItem key={`row3-${index}`} imageUrl={url} />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
