# Open Source Research Notes

MineScope now includes an explainable prospectivity layer informed by adjacent
mineral-exploration and geospatial open-source projects. No upstream source code
is vendored in this repository.

## Mineral Prospectivity And Geospatial References

- [GispoCoding/eis_toolkit](https://github.com/GispoCoding/eis_toolkit)
  - Referenced for mineral prospectivity mapping concepts and evidence-layer
    thinking.
  - MineScope implementation: `src/utils/prospectivity-scoring.ts` scores
    target zones from geology, geochemistry, geophysics, infrastructure,
    policy, and confidence inputs.
- [GispoCoding/eis_qgis_plugin](https://github.com/GispoCoding/eis_qgis_plugin)
  - Referenced for QGIS-adjacent workflow ideas and exploration-user
    expectations.
  - MineScope implementation: `ProspectivityExplorer` presents target zones as
    an analyst-facing dashboard that can later export to GIS workflows.
- [RichardScottOZ/mineral-exploration-machine-learning](https://github.com/RichardScottOZ/mineral-exploration-machine-learning)
  - Referenced as a public resource map for mineral exploration ML methods and
    datasets.
  - MineScope implementation: the prospectivity layer is intentionally
    explainable and evidence-based instead of a black-box score.

## Follow-up Candidates

These were identified in discovery but still need license/activity review
before any deeper integration:

- [bsomps/BlenderGeoModeller](https://github.com/bsomps/BlenderGeoModeller)
- [peterhil/ninhursag](https://github.com/peterhil/ninhursag)
- [ChengYeung1222/3DMPM](https://github.com/ChengYeung1222/3DMPM)
- [koala73/worldmonitor](https://github.com/koala73/worldmonitor)

## Attribution And Reuse Rules

- Preserve upstream license and copyright notices if any code is copied in the
  future.
- Prefer citations, adapters, and data-export compatibility over vendoring code.
- If upstream code is vendored, add the source repo, license, and commit SHA to
  this file.
