import React from "react";
import "./utils.css";

export const sortLabelsByPosition = (data) => {
  // Given a "settings_str" for a status column, extract the necessary parts of the data
  let { labels, labels_colors, labels_positions_v2 } = data;

  if (!labels_positions_v2) {
    // No labels_positions_v2 - This seems to happen when column has never
    // been reordered, so we can just create an object of the same form
    // which has the same order as they appear in `labels`
    labels_positions_v2 = {};
    Object.keys(labels).forEach((label, index) => {
      labels_positions_v2[label] = index;
    });
  }

  // Create an array of objects, each containing the label and its colors
  const sortedLabels = Object.keys(labels_positions_v2)
    .sort((a, b) => labels_positions_v2[a] - labels_positions_v2[b])
    .filter((labelKey) => labels[labelKey] !== undefined)
    .map((labelKey, index) => {
      return {
        value: labels[labelKey],
        label: labels[labelKey],
        color: labels_colors[labelKey]?.color || null,
        border: labels_colors[labelKey]?.border || null,
        index,
      };
    });

  return sortedLabels;
};

export const processStatusColSettingsStr = (column) => {
  // Given a "settings_str" for a status column, extract the necessary parts of the data
  const data = JSON.parse(column.settings_str);
  const sortedLabels = sortLabelsByPosition(data);
  return sortedLabels;
};

// n.b. this is duplicated in the backend code, any changes need syncing
export const getDefaultMapping = (statusCols) => {
  const type = "initial"; // We only need one type to get the default mapping

  const map = new Array(statusCols[type].prob.length)
    .fill(0)
    .map(() => new Array(statusCols[type].impact.length).fill(0));

  // Assume the last risk level is a TBC
  const riskLevelsCount = statusCols[type].risk.length - 1;
  const maxDistance = Math.sqrt((map.length - 1) ** 2 + (map[0].length - 1) ** 2);
  const fiddleFactor = 2; // Reduces the output levels a bit because low risk is preferred

  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      const distance = Math.sqrt(i ** 2 + j ** 2);
      map[i][j] = Math.round(
        ((distance / maxDistance) ** fiddleFactor) * (riskLevelsCount - 1)
      );
    }
  }

  return {
    initial: map,
    residual: map,
  };
};

export const MappingTable = ({ columnLabels, rowLabels, renderCell }) => {
  return (
    <table className="mappingTable">
      <thead>
        <tr>
          <th></th>
          {columnLabels.map((column, columnIndex) => (
            <th
              key={columnIndex}
              style={{ color: "white", backgroundColor: column.color }}
            >
              {column.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rowLabels.map((row, rowIndex) => (
          <tr key={rowIndex}>
            <th style={{ color: "white", backgroundColor: row.color }}>
              {row.label}
            </th>
            {columnLabels.map((column, columnIndex) => (
              <td key={columnIndex}>{renderCell(rowIndex, columnIndex)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const initialProbColumRe = /(intitial|inherent) (risk|likelihood|probability)/;
const initialImpactColumnRe = /(intitial|inherent) (impact)/;
const inititialRiskColumnRe = /(intitial|inherent) (risk)/;

const residualProbColumnRe = /(residual|ongoing) (risk|likelihood|probability)/;
const residualImpactColumnRe = /(residual|ongoing) (impact)/;
const residualRiskColumnRe = /(residual|ongoing) (risk)/;

const getColByNameRegEx = (columns, colNames) => {
  const matches = columns.filter((column) =>
    colNames.test(column.title.toLowerCase())
  );
  if (!matches) return {};
  return matches[0];
};

export const getColumnMapping = (columns) => {
  const initialProbColumn = getColByNameRegEx(columns, initialProbColumRe);
  const initialImpactColumn = getColByNameRegEx(columns, initialImpactColumnRe);
  const inititialRiskColumn = getColByNameRegEx(columns, inititialRiskColumnRe);

  const residualProbColumn = getColByNameRegEx(columns, residualProbColumnRe);
  const residualRiskColumn = getColByNameRegEx(columns, residualRiskColumnRe);
  const residualImpactColumn = getColByNameRegEx(
    columns,
    residualImpactColumnRe
  );

  // TODO: handle the case that any of the required columns are missing

  const mapping = {
    initial: {
      prob: processStatusColSettingsStr(initialProbColumn),
      impact: processStatusColSettingsStr(initialImpactColumn),
      risk: processStatusColSettingsStr(inititialRiskColumn),
    },
    residual: {
      prob: processStatusColSettingsStr(residualProbColumn),
      impact: processStatusColSettingsStr(residualImpactColumn),
      risk: processStatusColSettingsStr(residualRiskColumn),
    },
  };
  const ids = {
    initial: {
      prob: initialProbColumn.id,
      impact: initialImpactColumn.id,
      risk: inititialRiskColumn.id,
    },
    residual: {
      prob: residualProbColumn.id,
      impact: residualImpactColumn.id,
      risk: residualRiskColumn.id,
    },
  };
  const titles = {
    initial: {
      prob: initialProbColumn.title,
      impact: initialImpactColumn.title,
      risk: inititialRiskColumn.title,
    },
    residual: {
      prob: residualProbColumn.title,
      impact: residualImpactColumn.title,
      risk: residualRiskColumn.title,
    },
  };

  return {
    statusCols: mapping,
    columnIds: ids,
    columnTitles: titles,
  };
};

export const getEmptySummaryMatrix = (statusCols) => {
  const summary = {};
  for (const type of ["initial", "residual"]) {
    summary[type] = new Array(statusCols[type].prob.length)
      .fill(0)
      .map(() => new Array(statusCols[type].impact.length).fill(0));
  }
  return summary;
};

export const getEmptyPieChartData = (statusCols) => {
  const pieChartData = {};
  for (const type of ["initial", "residual"]) {
    pieChartData[type] = statusCols[type].risk.map((label) => ({
      label: label.label,
      count: 0,
      color: label.color,
    }));
  }
  return pieChartData;
}

export const getEmptyGroupedBarChartData = (groups, statusCols) => {
  const groupedBarChartData = {};
  for (const type of ["initial", "residual"]) {
    groupedBarChartData[type] = {};
    for (const group of groups) {
      groupedBarChartData[type][group.id] = statusCols[type].risk.map(
        (label) => ({
          label: label.label,
          count: 0,
          color: label.color,
        })
      );
    }
  }
  return groupedBarChartData;
}

export const Tag = ({ label, color }) => (
  <span className="tag" style={{ backgroundColor: color }}>
    {label}
  </span>
);
