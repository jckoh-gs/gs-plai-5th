// Media capabilities follow the frozen product version, including rollback releases.
module.exports=function(version){const match=/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/.exec(version||'');if(!match)throw Error('Invalid release product version');const major=Number(match[1]),minor=Number(match[2]);return {preview:major>1||(major===1&&minor>=1),commandExport:major>1||(major===1&&minor>=2)};};
