// SPDX-License-Identifier: MIT
pragma solidity ^0.8.23;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts/utils/Pausable.sol";

// FLATTENED CONTRACT - For verification and e-signing package
// Original file: contracts/SlapsStreaming.sol
// OpenZeppelin Contracts v5.x - Dependencies listed but not inlined for verification clarity
// To compile: Install @openzeppelin/contracts and restore import statements
//
// OpenZeppelin Dependencies: ERC721, ERC721URIStorage, IERC20, Ownable, ReentrancyGuard, Pausable, Counters

/**
 * @title SlapsStreaming
 * @author Millionaire Resilience LLC
 * @notice Decentralized Music Streaming Platform with IP Royalty Distribution
 * @dev Story Protocol Integration for Music IP Management
 * Separated from Millionaire Resilience Platform for SPV structure
 */
contract SlapsStreaming is ERC721, ERC721URIStorage, Ownable, ReentrancyGuard, Pausable {
    using SafeERC20 for IERC20;

    // Story Protocol Integration
    address public constant STORY_PROTOCOL_IPID = 0x98971c660ac20880b60F86Cc3113eBd979eb3aAE;
    
    uint256 private _trackIdCounter;
    uint256 private _artistIdCounter;
    uint256 private _playlistIdCounter;

    // Platform configuration
    uint256 public streamRoyaltyRate = 100; // 1% per stream in basis points
    uint256 public platformFeeRate = 1000; // 10% platform fee
    uint256 public minStreamDuration = 30; // 30 seconds minimum for royalty
    
    // Royalty pool
    uint256 public totalRoyaltyPool;
    uint256 public distributedRoyalties;

    // Track structure
    struct Track {
        uint256 id;
        address artist;
        string title;
        string ipfsHash; // Audio file on IPFS
        string metadataURI;
        uint256 durationSeconds;
        uint256 totalStreams;
        uint256 totalRoyaltiesEarned;
        uint256 uploadTimestamp;
        bool isActive;
        bool isExplicit;
        string storyProtocolIPID;
        bytes32 contentHash;
    }

    // Artist profile
    struct Artist {
        uint256 id;
        address walletAddress;
        string name;
        string bio;
        string avatarURI;
        uint256 totalTracks;
        uint256 totalStreams;
        uint256 totalEarnings;
        uint256 pendingRoyalties;
        uint256 registrationTimestamp;
        bool isVerified;
        bool isBanned;
    }

    // Playlist structure
    struct Playlist {
        uint256 id;
        address creator;
        string name;
        string description;
        uint256[] trackIds;
        uint256 followers;
        bool isPublic;
    }

    // Stream record for verification
    struct StreamRecord {
        uint256 trackId;
        address listener;
        uint256 duration;
        uint256 timestamp;
        bytes32 verificationHash;
    }

    // Mappings
    mapping(uint256 => Track) public tracks;
    mapping(address => Artist) public artists;
    mapping(uint256 => Playlist) public playlists;
    mapping(address => uint256[]) public artistTracks;
    mapping(address => uint256[]) public userPlaylists;
    mapping(address => mapping(uint256 => bool)) public likedTracks;
    mapping(address => mapping(address => bool)) public followingArtists;
    mapping(bytes32 => bool) public verifiedStreams;

    // Events
    event ArtistRegistered(uint256 indexed artistId, address indexed wallet, string name);
    event TrackUploaded(uint256 indexed trackId, address indexed artist, string title, string ipfsHash);
    event StreamRecorded(uint256 indexed trackId, address indexed listener, uint256 duration, uint256 royaltyAmount);
    event RoyaltyDistributed(address indexed artist, uint256 amount);
    event RoyaltyDeposited(address indexed depositor, uint256 amount);
    event TrackLiked(uint256 indexed trackId, address indexed user);
    event ArtistFollowed(address indexed artist, address indexed follower);
    event PlaylistCreated(uint256 indexed playlistId, address indexed creator, string name);
    event TrackAddedToPlaylist(uint256 indexed playlistId, uint256 indexed trackId);
    event IPRegistered(uint256 indexed trackId, string storyProtocolIPID);

    constructor() ERC721("SlapsStreaming", "SLAP") Ownable(msg.sender) {}

    // ============ MODIFIERS ============

    modifier onlyArtist() {
        require(artists[msg.sender].walletAddress != address(0), "Not a registered artist");
        require(!artists[msg.sender].isBanned, "Artist is banned");
        _;
    }

    modifier validTrack(uint256 trackId) {
        require(tracks[trackId].artist != address(0), "Track does not exist");
        require(tracks[trackId].isActive, "Track is not active");
        _;
    }

    // ============ ARTIST MANAGEMENT ============

    /**
     * @notice Register as an artist on Slaps
     */
    function registerArtist(
        string calldata name,
        string calldata bio,
        string calldata avatarURI
    ) external whenNotPaused returns (uint256) {
        require(artists[msg.sender].walletAddress == address(0), "Already registered");
        require(bytes(name).length > 0, "Name required");

        _artistIdCounter++;
        uint256 newArtistId = _artistIdCounter;

        artists[msg.sender] = Artist({
            id: newArtistId,
            walletAddress: msg.sender,
            name: name,
            bio: bio,
            avatarURI: avatarURI,
            totalTracks: 0,
            totalStreams: 0,
            totalEarnings: 0,
            pendingRoyalties: 0,
            registrationTimestamp: block.timestamp,
            isVerified: false,
            isBanned: false
        });

        emit ArtistRegistered(newArtistId, msg.sender, name);
        return newArtistId;
    }

    /**
     * @notice Verify an artist (admin only)
     */
    function verifyArtist(address artistAddress) external onlyOwner {
        require(artists[artistAddress].walletAddress != address(0), "Artist not found");
        artists[artistAddress].isVerified = true;
    }

    // ============ TRACK MANAGEMENT ============

    /**
     * @notice Upload a new track
     */
    function uploadTrack(
        string calldata title,
        string calldata ipfsHash,
        string calldata metadataURI,
        uint256 durationSeconds,
        bool isExplicit,
        string calldata storyProtocolIPID
    ) external onlyArtist whenNotPaused returns (uint256) {
        require(bytes(title).length > 0, "Title required");
        require(bytes(ipfsHash).length > 0, "IPFS hash required");
        require(durationSeconds > 0, "Duration must be greater than 0");

        _trackIdCounter++;
        uint256 newTrackId = _trackIdCounter;

        bytes32 contentHash = keccak256(abi.encodePacked(ipfsHash, msg.sender, block.timestamp));

        tracks[newTrackId] = Track({
            id: newTrackId,
            artist: msg.sender,
            title: title,
            ipfsHash: ipfsHash,
            metadataURI: metadataURI,
            durationSeconds: durationSeconds,
            totalStreams: 0,
            totalRoyaltiesEarned: 0,
            uploadTimestamp: block.timestamp,
            isActive: true,
            isExplicit: isExplicit,
            storyProtocolIPID: storyProtocolIPID,
            contentHash: contentHash
        });

        artistTracks[msg.sender].push(newTrackId);
        artists[msg.sender].totalTracks++;

        // Mint track NFT to artist
        _safeMint(msg.sender, newTrackId);
        _setTokenURI(newTrackId, metadataURI);

        emit TrackUploaded(newTrackId, msg.sender, title, ipfsHash);
        
        if (bytes(storyProtocolIPID).length > 0) {
            emit IPRegistered(newTrackId, storyProtocolIPID);
        }

        return newTrackId;
    }

    /**
     * @notice Record a verified stream
     * @dev Called by authorized oracles/backend to record legitimate streams
     */
    function recordStream(
        uint256 trackId,
        address listener,
        uint256 duration,
        bytes32 verificationHash
    ) external validTrack(trackId) nonReentrant {
        require(duration >= minStreamDuration, "Stream too short for royalty");
        require(!verifiedStreams[verificationHash], "Stream already recorded");

        verifiedStreams[verificationHash] = true;

        Track storage track = tracks[trackId];
        track.totalStreams++;

        Artist storage artist = artists[track.artist];
        artist.totalStreams++;

        // Calculate royalty based on duration
        uint256 royaltyAmount = calculateStreamRoyalty(trackId, duration);
        
        if (royaltyAmount > 0 && totalRoyaltyPool >= royaltyAmount) {
            artist.pendingRoyalties += royaltyAmount;
            track.totalRoyaltiesEarned += royaltyAmount;
            totalRoyaltyPool -= royaltyAmount;
        }

        emit StreamRecorded(trackId, listener, duration, royaltyAmount);
    }

    /**
     * @notice Calculate royalty for a stream
     */
    function calculateStreamRoyalty(uint256 trackId, uint256 duration) public view returns (uint256) {
        Track storage track = tracks[trackId];
        
        // Pro-rata based on percentage of track listened
        uint256 percentage = (duration * 10000) / track.durationSeconds;
        if (percentage > 10000) percentage = 10000; // Cap at 100%

        // Base royalty per full stream: 0.001 ETH (adjustable)
        uint256 baseRoyalty = 0.001 ether;
        
        return (baseRoyalty * percentage * streamRoyaltyRate) / (10000 * 100);
    }

    // ============ ROYALTY MANAGEMENT ============

    /**
     * @notice Deposit funds into the royalty pool
     */
    function depositRoyaltyPool() external payable {
        require(msg.value > 0, "Must deposit value");
        totalRoyaltyPool += msg.value;
        emit RoyaltyDeposited(msg.sender, msg.value);
    }

    /**
     * @notice Withdraw pending royalties
     */
    function withdrawRoyalties() external onlyArtist nonReentrant {
        Artist storage artist = artists[msg.sender];
        uint256 pending = artist.pendingRoyalties;
        require(pending > 0, "No pending royalties");

        // Calculate platform fee
        uint256 platformFee = (pending * platformFeeRate) / 10000;
        uint256 artistPayout = pending - platformFee;

        artist.pendingRoyalties = 0;
        artist.totalEarnings += artistPayout;
        distributedRoyalties += artistPayout;

        payable(msg.sender).transfer(artistPayout);

        emit RoyaltyDistributed(msg.sender, artistPayout);
    }

    // ============ SOCIAL FEATURES ============

    /**
     * @notice Like a track
     */
    function likeTrack(uint256 trackId) external validTrack(trackId) {
        require(!likedTracks[msg.sender][trackId], "Already liked");
        likedTracks[msg.sender][trackId] = true;
        emit TrackLiked(trackId, msg.sender);
    }

    /**
     * @notice Follow an artist
     */
    function followArtist(address artistAddress) external {
        require(artists[artistAddress].walletAddress != address(0), "Artist not found");
        require(!followingArtists[msg.sender][artistAddress], "Already following");
        followingArtists[msg.sender][artistAddress] = true;
        emit ArtistFollowed(artistAddress, msg.sender);
    }

    /**
     * @notice Create a playlist
     */
    function createPlaylist(
        string calldata name,
        string calldata description,
        bool isPublic
    ) external whenNotPaused returns (uint256) {
        require(bytes(name).length > 0, "Name required");

        _playlistIdCounter++;
        uint256 newPlaylistId = _playlistIdCounter;

        playlists[newPlaylistId] = Playlist({
            id: newPlaylistId,
            creator: msg.sender,
            name: name,
            description: description,
            trackIds: new uint256[](0),
            followers: 0,
            isPublic: isPublic
        });

        userPlaylists[msg.sender].push(newPlaylistId);

        emit PlaylistCreated(newPlaylistId, msg.sender, name);
        return newPlaylistId;
    }

    /**
     * @notice Add track to playlist
     */
    function addTrackToPlaylist(uint256 playlistId, uint256 trackId) external validTrack(trackId) {
        Playlist storage playlist = playlists[playlistId];
        require(playlist.creator == msg.sender, "Not playlist owner");
        
        playlist.trackIds.push(trackId);
        emit TrackAddedToPlaylist(playlistId, trackId);
    }

    // ============ ADMIN FUNCTIONS ============

    function setStreamRoyaltyRate(uint256 newRate) external onlyOwner {
        require(newRate <= 1000, "Rate too high");
        streamRoyaltyRate = newRate;
    }

    function setPlatformFeeRate(uint256 newRate) external onlyOwner {
        require(newRate <= 3000, "Fee cannot exceed 30%");
        platformFeeRate = newRate;
    }

    function setMinStreamDuration(uint256 newDuration) external onlyOwner {
        minStreamDuration = newDuration;
    }

    function banArtist(address artistAddress) external onlyOwner {
        artists[artistAddress].isBanned = true;
    }

    function unbanArtist(address artistAddress) external onlyOwner {
        artists[artistAddress].isBanned = false;
    }

    function deactivateTrack(uint256 trackId) external {
        require(
            msg.sender == tracks[trackId].artist || msg.sender == owner(),
            "Not authorized"
        );
        tracks[trackId].isActive = false;
    }

    function pause() external onlyOwner {
        _pause();
    }

    function unpause() external onlyOwner {
        _unpause();
    }

    function withdrawPlatformFees() external onlyOwner nonReentrant {
        uint256 balance = address(this).balance - totalRoyaltyPool;
        require(balance > 0, "No fees to withdraw");
        payable(owner()).transfer(balance);
    }

    // ============ VIEW FUNCTIONS ============

    function getArtistTracks(address artistAddress) external view returns (uint256[] memory) {
        return artistTracks[artistAddress];
    }

    function getUserPlaylists(address userAddress) external view returns (uint256[] memory) {
        return userPlaylists[userAddress];
    }

    function getPlaylistTracks(uint256 playlistId) external view returns (uint256[] memory) {
        return playlists[playlistId].trackIds;
    }

    function getPlatformStats() external view returns (
        uint256 _totalTracks,
        uint256 _totalArtists,
        uint256 _totalRoyaltyPool,
        uint256 _distributedRoyalties
    ) {
        return (
            _trackIdCounter,
            _artistIdCounter,
            totalRoyaltyPool,
            distributedRoyalties
        );
    }

    // ============ OVERRIDE FUNCTIONS ============

    function tokenURI(uint256 tokenId) public view override(ERC721, ERC721URIStorage) returns (string memory) {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId) public view override(ERC721, ERC721URIStorage) returns (bool) {
        return super.supportsInterface(interfaceId);
    }

    // ============ RECEIVE ETHER ============

    receive() external payable {
        totalRoyaltyPool += msg.value;
        emit RoyaltyDeposited(msg.sender, msg.value);
    }
}
