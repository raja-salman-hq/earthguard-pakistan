#!/usr/bin/env python3
"""
GeoTIFF -> small colored PNG map overlays for the EarthGuard website.

Put this file in the repo as:  gis/tif_to_web_overlay.py

What it does
  * reads each GeoTIFF (band 1 by default) and reprojects it to EPSG:4326
    (longitude/latitude), which is what web maps use
  * optionally makes everything outside the study area transparent
  * colors all inputs of ONE run with the SAME color scale, so two years can be
    compared honestly (a color means the same value in both maps)
  * writes <name>.png plus maps.json (bounds, color range, unit, legend colors,
    statistics) into the output folder. The website reads maps.json.

Nothing is invented: the colors come only from the pixel values in your files.

Examples (Windows PowerShell, use ^ or ` for line breaks)

  # Two years with the same scale (absolute values)
  python gis/tif_to_web_overlay.py --out public/data/areas/faisalabad/maps --unit "°C" ^
      --aoi public/data/areas/faisalabad/study-area.geojson ^
      --input lst_2001=C:\\path\\LST_2001_Celsius.tif ^
      --input lst_2024=C:\\path\\LST_2024_Celsius.tif

  # A change map (blue = decrease, red = increase, centered on 0)
  python gis/tif_to_web_overlay.py --out public/data/areas/faisalabad/maps --unit "°C" ^
      --diverging --aoi public/data/areas/faisalabad/study-area.geojson ^
      --input lst_change=C:\\path\\LST_Change_2001_2024.tif

Run each example as its own command. Check the printed min/max first: if the
values look wrong for the unit (for example LST of 300 means Kelvin), stop and ask
the data owner before publishing the map.

Needs:  pip install rasterio numpy matplotlib shapely
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path

import numpy as np

try:
    import rasterio
    from rasterio.features import geometry_mask
    from rasterio.warp import Resampling, calculate_default_transform, reproject
except ImportError:  # pragma: no cover
    sys.exit("rasterio is not installed. Run: pip install rasterio numpy matplotlib shapely")

try:
    import matplotlib

    matplotlib.use("Agg")
    import matplotlib.image as mpimg
    from matplotlib import colormaps
    from matplotlib.colors import to_hex
except ImportError:  # pragma: no cover
    sys.exit("matplotlib is not installed. Run: pip install matplotlib")

NAME_RE = re.compile(r"^[a-z0-9_-]+$")


def load_aoi(path: str):
    from shapely.geometry import shape
    from shapely.ops import unary_union

    data = json.loads(Path(path).read_text(encoding="utf-8"))
    kind = data.get("type")
    if kind == "FeatureCollection":
        geoms = [shape(f["geometry"]) for f in data["features"] if f.get("geometry")]
    elif kind == "Feature":
        geoms = [shape(data["geometry"])]
    else:
        geoms = [shape(data)]
    if not geoms:
        sys.exit("The AOI file has no geometry.")
    geom = unary_union(geoms)
    min_x, min_y, max_x, max_y = geom.bounds
    if not (-180 <= min_x <= 180 and -180 <= max_x <= 180 and -90 <= min_y <= 90 and -90 <= max_y <= 90):
        sys.exit("The AOI is not in EPSG:4326 (longitude/latitude). Re-export it as WGS84 GeoJSON.")
    return geom


def read_reprojected(path: Path, band: int, aoi):
    """Return (array in EPSG:4326 with NaN for no data, transform, info)."""
    with rasterio.open(path) as src:
        if src.crs is None:
            sys.exit(f"{path.name} has no coordinate system, so it cannot be placed on a map.")
        if band < 1 or band > src.count:
            sys.exit(f"{path.name} has {src.count} band(s); --band {band} does not exist.")

        data = src.read(band).astype("float32")
        nodata = src.nodata
        if nodata is not None and np.isfinite(nodata):
            data[data == nodata] = np.nan
        data[~np.isfinite(data)] = np.nan

        scale = src.scales[band - 1] if src.scales else 1.0
        offset = src.offsets[band - 1] if src.offsets else 0.0
        if (scale, offset) != (1.0, 0.0):
            data = data * np.float32(scale) + np.float32(offset)
            print(f"  applied scale={scale} offset={offset} stored in {path.name}")

        dst_crs = "EPSG:4326"
        transform, width, height = calculate_default_transform(
            src.crs, dst_crs, src.width, src.height, *src.bounds
        )
        out = np.full((height, width), np.nan, dtype="float32")
        reproject(
            source=data,
            destination=out,
            src_transform=src.transform,
            src_crs=src.crs,
            dst_transform=transform,
            dst_crs=dst_crs,
            src_nodata=np.nan,
            dst_nodata=np.nan,
            resampling=Resampling.nearest,  # keeps the real pixel values
        )
        info = {"source_crs": str(src.crs), "source_size": [src.width, src.height], "band": band}

    if aoi is not None:
        from shapely.geometry import mapping

        inside = geometry_mask([mapping(aoi)], out_shape=out.shape, transform=transform, invert=True)
        out[~inside] = np.nan

    return out, transform, info


def bounds_of(transform, width: int, height: int):
    west = transform.c
    north = transform.f
    east = west + width * transform.a
    south = north + height * transform.e  # e is negative
    return west, south, east, north


def colorize(arr: np.ndarray, vmin: float, vmax: float, cmap_name: str) -> np.ndarray:
    cmap = colormaps[cmap_name]
    norm = np.clip((arr - vmin) / (vmax - vmin), 0.0, 1.0)
    rgba = cmap(np.nan_to_num(norm, nan=0.0))
    rgba[..., 3] = np.where(np.isfinite(arr), 1.0, 0.0)
    return (rgba * 255).astype(np.uint8)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--input", action="append", required=True, metavar="NAME=PATH",
                        help="Name (a-z 0-9 _ -) and GeoTIFF path. Repeat for several files that share a scale.")
    parser.add_argument("--out", required=True, help="Output folder for PNG files and maps.json")
    parser.add_argument("--unit", default="", help="Unit shown in the legend, for example °C")
    parser.add_argument("--aoi", help="Study-area GeoJSON (EPSG:4326). Pixels outside become transparent.")
    parser.add_argument("--band", type=int, default=1)
    parser.add_argument("--cmap", help="Matplotlib colormap name (default viridis, or RdBu_r with --diverging)")
    parser.add_argument("--diverging", action="store_true", help="Symmetric scale around --center (for change maps)")
    parser.add_argument("--center", type=float, default=0.0)
    parser.add_argument("--percentiles", nargs=2, type=float, default=[2.0, 98.0], metavar=("LOW", "HIGH"),
                        help="Color range from these percentiles of all valid pixels (default 2 98)")
    parser.add_argument("--vmin", type=float, help="Fixed lower end of the color scale")
    parser.add_argument("--vmax", type=float, help="Fixed upper end of the color scale")
    args = parser.parse_args()

    cmap_name = args.cmap or ("RdBu_r" if args.diverging else "viridis")
    if cmap_name not in colormaps:
        sys.exit(f"Unknown colormap '{cmap_name}'.")

    pairs: list[tuple[str, Path]] = []
    for item in args.input:
        if "=" not in item:
            sys.exit(f"--input must look like NAME=PATH, got: {item}")
        name, raw = item.split("=", 1)
        if not NAME_RE.match(name):
            sys.exit(f"Invalid name '{name}'. Use lowercase letters, digits, - or _.")
        path = Path(raw.strip('"'))
        if not path.is_file():
            sys.exit(f"File not found: {path}")
        pairs.append((name, path))

    aoi = load_aoi(args.aoi) if args.aoi else None

    layers = {}
    for name, path in pairs:
        print(f"Reading {name}: {path.name}")
        arr, transform, info = read_reprojected(path, args.band, aoi)
        valid = arr[np.isfinite(arr)]
        if valid.size == 0:
            sys.exit(f"{path.name}: no valid pixels after reprojection/clipping. Check the AOI and the file.")
        print(f"  size {arr.shape[1]}x{arr.shape[0]} px, valid pixels {valid.size}, "
              f"min {valid.min():.3f}  mean {valid.mean():.3f}  max {valid.max():.3f}")
        layers[name] = (arr, transform, info, path)

    # Warn when files of one run do not cover the same area
    boxes = {n: bounds_of(t, a.shape[1], a.shape[0]) for n, (a, t, _, _) in layers.items()}
    first = next(iter(boxes.values()))
    for n, b in boxes.items():
        if any(abs(x - y) > 1e-3 for x, y in zip(b, first)):
            print(f"!! WARNING: {n} covers a different area than the first input. "
                  "Maps meant for side-by-side comparison should share the same extent.")

    pooled = np.concatenate([a[np.isfinite(a)] for a, _, _, _ in layers.values()])
    low, high = np.percentile(pooled, args.percentiles)
    if args.diverging:
        half = max(abs(low - args.center), abs(high - args.center))
        vmin, vmax = args.center - half, args.center + half
    else:
        vmin, vmax = float(low), float(high)
    if args.vmin is not None:
        vmin = args.vmin
    if args.vmax is not None:
        vmax = args.vmax
    if not vmax > vmin:
        sys.exit("The color range is empty (vmin >= vmax). Set --vmin and --vmax.")
    print(f"\nShared color scale: {vmin:.3f} to {vmax:.3f} {args.unit} ({cmap_name})")

    out_dir = Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)
    manifest_path = out_dir / "maps.json"
    manifest = {"images": {}}
    if manifest_path.exists():
        try:
            manifest = json.loads(manifest_path.read_text(encoding="utf-8"))
            manifest.setdefault("images", {})
        except json.JSONDecodeError:
            pass

    stops = [to_hex(colormaps[cmap_name](x)) for x in np.linspace(0, 1, 7)]
    for name, (arr, transform, info, path) in layers.items():
        height, width = arr.shape
        west, south, east, north = bounds_of(transform, width, height)
        png_path = out_dir / f"{name}.png"
        mpimg.imsave(png_path, colorize(arr, vmin, vmax, cmap_name))
        valid = arr[np.isfinite(arr)]
        manifest["images"][name] = {
            "file": png_path.name,
            "width": width,
            "height": height,
            "bounds": {"west": west, "south": south, "east": east, "north": north},
            "coordinates": [[west, north], [east, north], [east, south], [west, south]],
            "unit": args.unit,
            "vmin": vmin,
            "vmax": vmax,
            "cmap": cmap_name,
            "diverging": bool(args.diverging),
            "legend_stops": stops,
            "stats": {
                "min": float(valid.min()),
                "mean": float(valid.mean()),
                "max": float(valid.max()),
                "valid_pixels": int(valid.size),
            },
            "source_file": path.name,
            "source_crs": info["source_crs"],
            "resampling": "nearest",
            "clipped_to_aoi": aoi is not None,
        }
        print(f"Wrote {png_path}  ({png_path.stat().st_size / 1024:.0f} KB)")

    manifest["generated"] = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    manifest_path.write_text(json.dumps(manifest, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {manifest_path}")


if __name__ == "__main__":
    main()