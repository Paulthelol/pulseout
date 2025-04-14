'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import styles from './side-bar.module.css';
import { SignOut } from '@/lib/actions';

export default function SideBar() {
    return (
        <aside className={styles.sideBar}>
            <div className={styles.topSection}>
                <Image
                    src="/logo.png"
                    alt="PulseOut Logo"
                    width={140}
                    height={40}
                    className={styles.logoImage}
                />

                <nav className={styles.navSection}>
                    <Link href="/musicgrid/trending"><span>Trending</span></Link>
                    <Link href="#"><span>Genres</span></Link>
                    <Link href="/musicgrid/likes"><span>Likes</span></Link>
                </nav>
            </div>

            <div className={styles.bottomSection}>
                <Link href="#" className={styles.bottomLink}>
                    <span>My Profile</span>
                </Link>

                <div>
                    <form
                        action={SignOut}>
                        <button className={styles.bottomLink}>
                            Sign Out
                        </button>
                    </form>
                </div>

            </div>
        </aside>
    );
}
