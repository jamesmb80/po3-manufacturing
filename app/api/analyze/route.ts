import { NextRequest, NextResponse } from 'next/server';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

// GET /api/analyze - Comprehensive data analysis
export async function GET(request: NextRequest) {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { searchParams } = new URL(request.url);
    const detailed = searchParams.get('detailed') === 'true';

    // Get total record count
    const { count: totalRecords } = await supabase
      .from('ready2cut_parts')
      .select('*', { count: 'exact', head: true });

    // Fetch all unique values for categorical fields
    const [
      materials,
      types,
      colours,
      finishes,
      thicknesses,
      shapes,
      tags,
      orderStatuses
    ] = await Promise.all([
      supabase.from('ready2cut_parts').select('material').not('material', 'is', null),
      supabase.from('ready2cut_parts').select('type').not('type', 'is', null),
      supabase.from('ready2cut_parts').select('colour').not('colour', 'is', null),
      supabase.from('ready2cut_parts').select('finish').not('finish', 'is', null),
      supabase.from('ready2cut_parts').select('thickness').not('thickness', 'is', null),
      supabase.from('ready2cut_parts').select('shape').not('shape', 'is', null),
      supabase.from('ready2cut_parts').select('tags').not('tags', 'is', null),
      supabase.from('ready2cut_parts').select('order_status')
    ]);

    // Process unique values
    const uniqueValues = {
      materials: [...new Set(materials.data?.map(r => r.material) || [])].sort(),
      types: [...new Set(types.data?.map(r => r.type) || [])].sort(),
      colours: [...new Set(colours.data?.map(r => r.colour) || [])].sort(),
      finishes: [...new Set(finishes.data?.map(r => r.finish) || [])].sort(),
      thicknesses: [...new Set(thicknesses.data?.map(r => r.thickness) || [])].sort(),
      shapes: [...new Set(shapes.data?.map(r => r.shape) || [])].sort(),
      tags: [...new Set(tags.data?.map(r => r.tags) || [])].sort(),
      orderStatuses: [...new Set(orderStatuses.data?.map(r => r.order_status) || [])].sort()
    };

    // Get value counts for detailed analysis
    let valueCounts: any = {};
    if (detailed) {
      // Count occurrences of each unique value
      for (const [field, values] of Object.entries(uniqueValues)) {
        valueCounts[field] = {};
        for (const value of values) {
          const { count } = await supabase
            .from('ready2cut_parts')
            .select('*', { count: 'exact', head: true })
            .eq(field === 'orderStatuses' ? 'order_status' : field, value);
          valueCounts[field][value] = count || 0;
        }
      }
    }

    // Analyze dimension data
    const dimensionAnalysis = await analyzeDimensions();

    // Analyze data quality issues
    const qualityIssues = await analyzeDataQuality();

    const analysis = {
      summary: {
        totalRecords: totalRecords || 0,
        lastUpdated: new Date().toISOString(),
        uniqueCounts: {
          materials: uniqueValues.materials.length,
          types: uniqueValues.types.length,
          colours: uniqueValues.colours.length,
          finishes: uniqueValues.finishes.length,
          thicknesses: uniqueValues.thicknesses.length,
          shapes: uniqueValues.shapes.length,
          tags: uniqueValues.tags.length,
          orderStatuses: uniqueValues.orderStatuses.length
        }
      },
      uniqueValues,
      valueCounts: detailed ? valueCounts : undefined,
      dimensions: dimensionAnalysis,
      dataQuality: qualityIssues,
      recommendations: generateRecommendations(uniqueValues, qualityIssues)
    };

    return NextResponse.json({
      success: true,
      data: analysis,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Analysis error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to analyze data',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// Analyze dimension data patterns
async function analyzeDimensions() {
  const supabase = createServerComponentClient({ cookies });
  
  // Sample dimension data for analysis
  const { data: samples } = await supabase
    .from('ready2cut_parts')
    .select('depth, diameter, height, length, width')
    .limit(100);

  if (!samples) return null;

  const analysis = {
    formats: {
      depth: new Set<string>(),
      diameter: new Set<string>(),
      height: new Set<string>(),
      length: new Set<string>(),
      width: new Set<string>()
    },
    hasUnits: {
      depth: false,
      diameter: false,
      height: false,
      length: false,
      width: false
    },
    nullCounts: {
      depth: 0,
      diameter: 0,
      height: 0,
      length: 0,
      width: 0
    }
  };

  // Analyze each dimension field
  for (const record of samples) {
    for (const field of ['depth', 'diameter', 'height', 'length', 'width'] as const) {
      const value = record[field];
      if (value === null || value === '') {
        analysis.nullCounts[field]++;
      } else {
        // Check format (e.g., "100", "100mm", "100.5")
        if (value.match(/^\d+$/)) {
          analysis.formats[field].add('numeric');
        } else if (value.match(/^\d+(\.\d+)?$/)) {
          analysis.formats[field].add('decimal');
        } else if (value.match(/^\d+(\.\d+)?\s*(mm|cm|m)$/i)) {
          analysis.formats[field].add('with_units');
          analysis.hasUnits[field] = true;
        } else {
          analysis.formats[field].add('other');
        }
      }
    }
  }

  // Convert Sets to Arrays
  return {
    formats: Object.fromEntries(
      Object.entries(analysis.formats).map(([k, v]) => [k, Array.from(v)])
    ),
    hasUnits: analysis.hasUnits,
    nullPercentage: Object.fromEntries(
      Object.entries(analysis.nullCounts).map(([k, v]) => [k, (v / samples.length * 100).toFixed(1)])
    )
  };
}

// Analyze data quality issues
async function analyzeDataQuality() {
  const supabase = createServerComponentClient({ cookies });
  
  const issues = {
    nullValues: {} as Record<string, number>,
    inconsistentFormats: [] as string[],
    potentialDuplicates: 0,
    missingCriticalData: 0
  };

  // Check for null values in important fields
  const fieldsToCheck = ['material', 'thickness', 'increment_id', 'cutting_date'];
  for (const field of fieldsToCheck) {
    const { count } = await supabase
      .from('ready2cut_parts')
      .select('*', { count: 'exact', head: true })
      .is(field, null);
    if (count && count > 0) {
      issues.nullValues[field] = count;
    }
  }

  // Check for records missing critical data
  const { count: missingCritical } = await supabase
    .from('ready2cut_parts')
    .select('*', { count: 'exact', head: true })
    .or('increment_id.is.null,material.is.null,thickness.is.null');
  
  issues.missingCriticalData = missingCritical || 0;

  // Check for potential duplicates (same order ID and sheet ID)
  const { data: duplicateCheck } = await supabase
    .from('ready2cut_parts')
    .select('increment_id')
    .limit(1000);

  if (duplicateCheck) {
    const orderCounts = duplicateCheck.reduce((acc, rec) => {
      acc[rec.increment_id] = (acc[rec.increment_id] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    issues.potentialDuplicates = Object.values(orderCounts).filter(c => c > 10).length;
  }

  // Check for inconsistent thickness formats
  const { data: thicknessData } = await supabase
    .from('ready2cut_parts')
    .select('thickness')
    .not('thickness', 'is', null)
    .limit(100);

  if (thicknessData) {
    const formats = new Set(
      thicknessData.map(r => {
        if (r.thickness?.match(/^\d+mm$/)) return 'with_mm';
        if (r.thickness?.match(/^\d+$/)) return 'numeric_only';
        return 'other';
      })
    );
    
    if (formats.size > 1) {
      issues.inconsistentFormats.push('thickness');
    }
  }

  return issues;
}

// Generate recommendations based on analysis
function generateRecommendations(uniqueValues: any, qualityIssues: any): string[] {
  const recommendations = [];

  // Material recommendations
  if (uniqueValues.materials.length > 20) {
    recommendations.push('Consider implementing material category grouping for better organization');
  }
  if (uniqueValues.materials.length > 10) {
    recommendations.push('Add search functionality to material filter dropdown');
  }

  // Type recommendations
  if (uniqueValues.types.length > 15) {
    recommendations.push('Implement type categorization or hierarchical selection');
  }

  // Thickness recommendations
  if (qualityIssues.inconsistentFormats?.includes('thickness')) {
    recommendations.push('Normalize thickness values to consistent format (e.g., always include "mm")');
  }

  // Data quality recommendations
  if (Object.keys(qualityIssues.nullValues).length > 0) {
    recommendations.push('Handle null values in UI with appropriate defaults or indicators');
  }
  if (qualityIssues.missingCriticalData > 0) {
    recommendations.push(`Address ${qualityIssues.missingCriticalData} records missing critical data`);
  }

  // UI recommendations
  if (uniqueValues.colours.length > 0) {
    recommendations.push('Add colour column to the main table view');
  }
  if (uniqueValues.shapes.length > 1) {
    recommendations.push('Add shape filter and visual indicators');
  }

  // Performance recommendations
  recommendations.push('Implement column visibility controls to manage large number of fields');
  recommendations.push('Add pagination or virtual scrolling for large datasets');

  return recommendations;
}