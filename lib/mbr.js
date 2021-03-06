var util = require( 'util' )
var tty = require( 'tty' )
var isBuffer = Buffer.isBuffer

/**
 * Master Boot Record (MBR)
 * @param {Buffer} buffer (optional)
 * @param {Number} start (optional)
 * @param {Number} end (optional)
 */
function MBR( buffer, start, end ) {
  
  if( !(this instanceof MBR) || this.format === 'MBR' )
    return MBR.parse( buffer, start, end )
  
  // Partition table
  this.partitions = []
  // Bootloader code
  this.code = []
  
  for( var i = 0; i < this.partitionEntries; i++ ) {
    this.partitions.push( new MBR.Partition() )
  }
  
  if( isBuffer( buffer ) ) {
    this.parse( buffer, start, end )
  }
  
}

/**
 * Default partition table offset 
 * @type {Number}
 */
MBR.TABLE_OFFSET = 0x1BE

/**
 * Default number of partition entries
 * @type {Number}
 */
MBR.PARTITION_ENTRIES = 4

/**
 * Partition entry structure
 * @type {Function}
 */
MBR.Partition = require( './partition' )

/**
 * Code section structure
 * @type {Function}
 */
MBR.Code = require( './code' )

/**
 * Parses a buffer into an instance of MBR
 * @param  {Buffer} buffer
 * @param  {Number} start (optional)
 * @param  {Number} end (optional)
 * @return {MBR}
 */
MBR.parse = function( buffer, start, end ) {
  var buffer = buffer.slice( start, end )
  var format = MBR.detectFormat( buffer )
  return new MBR[ format ]( buffer )
}

/**
 * Detects the MBR format of a given buffer
 * @param  {Buffer} buffer
 * @return {String} format
 */
MBR.detectFormat = function( buffer ) {
  
  if( !isBuffer( buffer ) )
    throw new TypeError( 'Argument must be a Buffer' )
  
  if( buffer.length < 512 )
    throw new Error( 'Buffer too small (must be at least 512 bytes)' )
  
  // TODO: Move this into it's own static method (?)
  if( buffer.readUInt16LE( 0x1FE ) !== 0xAA55 ) {
    throw new SyntaxError(
      'Invalid MBR boot signature. Expected 0xAA55, ' +
      'but saw 0x' + buffer.readUInt16LE( 0x1FE )
        .toString( 16 ).toUpperCase()
    )
  }
  
  if( buffer[ 0x17C ] === 0x5A && buffer[ 0x17D ] === 0xA5 ) {
    return 'AST' // AST/NEC
  } else if( buffer[ 0x0FC ] === 0xAA && buffer[ 0x0FD ] === 0x55 ) {
    return 'DM' // Disk Manager
  } else if( buffer.toString( 'ascii', 0x02 ) === 'NEWLDR' ) {
    return 'NEWLDR'
  } else if( buffer[ 0x1AC ] === 0x78 && buffer[ 0x1AD ] === 0x56 ) {
    return 'AAP'
  } else if( buffer[ 0x0DA ] === 0x00 && buffer[ 0x0DB ] === 0x00 ) {
    return 'MODERN'
  } else {
    return 'CLASSIC'
  }
  
}

/**
 * Creates a blank buffer
 * with an MBR signature
 * @return {Buffer}
 */
MBR.createBuffer = function() {
  // 512 byte buffer
  var buffer = new Buffer( 0x200 )
  // Zero it
  buffer.fill( 0 )
  // Write MBR signature
  buffer[ 0x1FE ] = 0x55
  buffer[ 0x1FF ] = 0xAA
  
  return buffer
  
}

/**
 * Determines if a given partition
 * is an extended partition
 * @param  {Partition} partition
 * @return {Boolean}
 */
MBR.isExtendedPartition = function( partition ) {
  return MBR.Partition.isExtended( partition.type )
}

/**
 * MBR prototype
 * @type {Object}
 */
MBR.prototype = {
  
  constructor: MBR,
  
  get format() {
    return this.constructor.name
  },
  
  get tableOffset() {
    return this.constructor.TABLE_OFFSET
  },
  
  get partitionEntries() {
    return this.constructor.PARTITION_ENTRIES
  },
  
  parse: function( buffer, start, end ) {
    this.buffer = buffer.slice( start, end )
  },
  
}

// Exports
module.exports = MBR

MBR.CLASSIC = require( './format/classic' )
MBR.MODERN = require( './format/modern' )
MBR.AAP = require( './format/aap' )
MBR.NEWLDR = require( './format/newldr' )
MBR.AST = require( './format/ast' )
MBR.DM = require( './format/dm' )
